/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  CameraRoll,
  AlertIOS,
} from 'react-native';
import Swiper from 'react-native-swiper';
import NetworkImage from 'react-native-image-progress';
import ProgressCircle from 'react-native-progress/Circle';
import ShakeEvent from 'react-native-shake-event';

import RandManager from './RandManager';
import Utils from './Utils';
import ProgressHUD from './ProgressHUD';

const NUM_WALLPAPERS = 5;
const DOUBLE_TAP_DELAY = 300; // milliseconds
const DOUBLE_TAP_RADIUS = 20;
const {width, height} = Dimensions.get('window');

export default class SplashWalls extends Component {

  constructor(props) {
    super(props);

    this.state = {
      wallsJSON: [],
      isLoading: true,
      isHudVisible: false,
    };
    this.imagePanResponder = {};
    this.prevTouchInfo = {
      prevTouchX: 0,
      prevTouchY: 0,
      prevTouchTimeStamp: 0,
    };
    this.currentWallIndex = 0;

    this.handlePanResponderGrant = this.handlePanResponderGrant.bind(this);
    this.onMomentumScrollEnd = this.onMomentumScrollEnd.bind(this);
  }

  initialize() {
    this.setState({
      wallsJSON: [],
      isLoading: true,
      isHudVisible: false,
    });

    this.currentWallIndex = 0;
  }

  fetchWallsJSON() {
    const url = 'https://unsplash.it/list';
    fetch(url)
      .then(response => response.json())
      .then(jsonData => {
        const randomIds = RandManager.uniqueRandomNumbers(NUM_WALLPAPERS, 0, jsonData.length);
        let walls = [];
        randomIds.forEach(randomId => {
          walls.push(jsonData[randomId]);
        });

        this.setState({
          isLoading: false,
          wallsJSON: [].concat(walls),
        });
      })
      .catch(error => console.log(`Fetch error ${error}`));
  }

  onMomentumScrollEnd(e, state, context) {
    this.currentWallIndex = state.index;
  }

  saveCurrentWallpaperToCameraRoll() {
    this.setState({isHudVisible: true});
    const { wallsJSON } = this.state;
    const currentWall = wallsJSON[this.currentWallIndex];
    const currentWallURL = `https://unsplash.it/${currentWall.width}/${currentWall.height}?image=${currentWall.id}`;

    CameraRoll.saveToCameraRoll(currentWallURL)
      .then(data => {
        this.setState({isHudVisible: false});
        AlertIOS.alert(
          'Saved',
          'Wallpaper successfully saved to Camera Roll',
          [
            {
              text: 'High 5!',
              onPress: () => console.log('OK Pressed!'),
            }
          ]
        );
      }, err => {
        console.log('Error saving to camera roll', err);
      });
  }

  isDoubleTap(currentTouchTimeStamp, {x0, y0}) {
    const { prevTouchX, prevTouchY, prevTouchTimeStamp } = this.prevTouchInfo;
    const dt = currentTouchTimeStamp - prevTouchTimeStamp;

    return (dt < DOUBLE_TAP_DELAY && Utils.distance(prevTouchX, prevTouchY, x0, y0) < DOUBLE_TAP_RADIUS);
  }

  handleStartShouldSetPanResponder(e, gestureState) {
    return true;
  }

  handlePanResponderGrant(e, gestureState) {
    const currentTouchTimeStamp = Date.now();

    if (this.isDoubleTap(currentTouchTimeStamp, gestureState))
      this.saveCurrentWallpaperToCameraRoll();

    this.prevTouchInfo = {
      prevTouchX: gestureState.x0,
      prevTouchY: gestureState.y0,
      prevTouchTimeStamp: currentTouchTimeStamp,
    };
  }

  handlePanResponderEnd(e, gestureState) {
    console.log('Finger pulled up from the image');
  }

  componentWillMount() {
    this.imagePanResponder = PanResponder.create({
      onStartShouldSetPanResponder: this.handleStartShouldSetPanResponder,
      onPanResponderGrant: this.handlePanResponderGrant,
      onPanResponderRelease: this.handlePanResponderEnd,
      onPanResponderTerminate: this.handlePanResponderEnd,
    });

    // Fetch new wallpapers on shake
    ShakeEvent.addEventListener('shake', () => {
      this.initialize();
      this.fetchWallsJSON();
    });
  }

  componentDidMount() {
    this.fetchWallsJSON();
  }

  renderLoadingMessage() {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          animating={true}
          color="#fff"
          size="small"
          style={{margin: 15}}
        />
        <Text style={{color: '#fff'}}>Contacting Unsplash</Text>
      </View>
    );
  }

  renderResults() {
    const { wallsJSON, isLoading, isHudVisible } = this.state;
    if (!isLoading) {
      return (
        <View style={{flexGrow: 1}}>
          <Swiper
            dot={<View style={{backgroundColor:'rgba(255,255,255,.4)', width: 8, height: 8,borderRadius: 10, marginLeft: 3, marginRight: 3, marginTop: 3, marginBottom: 3,}} />}
            activeDot={<View style={{backgroundColor: '#fff', width: 13, height: 13, borderRadius: 7, marginLeft: 7, marginRight: 7}} />}
            loop={false}
            onMomentumScrollEnd={this.onMomentumScrollEnd}
            style={{backgroundColor: '#f00'}}
          >
            {wallsJSON.map((wallpaper, index) =>
              <View key={index} style={{flexGrow: 1}}>
                <NetworkImage
                  source={{uri: `https://unsplash.it/${wallpaper.width}/${wallpaper.height}?image=${wallpaper.id}`}}
                  indicator={ProgressCircle}
                  indicatorProps={{
                    color: 'rgba(255,255,255,1)',
                    size: 60,
                    thickness: 7,
                  }}
                  style={styles.wallpaperImage}
                  {...this.imagePanResponder.panHandlers}
                >
                  <Text style={styles.label}>Photo by</Text>
                  <Text style={styles.label_authorName}>{wallpaper.author}</Text>
                </NetworkImage>
              </View>
            )}
          </Swiper>
          <ProgressHUD width={width} height={height} isVisible={isHudVisible} />
        </View>
      );
    }
  }

  render() {
    const { isLoading } = this.state;
    if (isLoading)
      return this.renderLoadingMessage();
    else
      return this.renderResults();
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000'
  },
  wallpaperImage: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: '#000',
  },
  label: {
    position: 'absolute',
    color: '#fff',
    fontSize: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 2,
    paddingLeft: 5,
    top: 20,
    left: 20,
    width: width/2
  },
  label_authorName: {
    position: 'absolute',
    color: '#fff',
    fontSize: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 2,
    paddingLeft: 5,
    top: 41,
    left: 20,
    fontWeight: 'bold',
    width: width/2
  },
});

AppRegistry.registerComponent('SplashWalls', () => SplashWalls);
