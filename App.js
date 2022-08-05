/**

 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  Text,
  Heading,
  NativeBaseProvider,
  Box,
  extendTheme,
  Flex,
  Image,
  ScrollView,
} from 'native-base';
import Icon from 'react-native-vector-icons/Ionicons';
import {StatusBar} from 'react-native';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import SplashScreen from 'react-native-splash-screen';
import GetLocation from 'react-native-get-location';
import LocationEnabler from 'react-native-location-enabler';
import axios from 'axios';
import {RAPID_API_KEY} from '@env';

SystemNavigationBar.setNavigationColor('hsla(0,0%,0%,0)');

// Define the config
const config = {
  useSystemColorMode: false,
  initialColorMode: 'dark',
};

// extend the theme
export const theme = extendTheme({
  colors: {
    primary: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#131313',
    },
    underlineColor: 'rgba(245,243,255,0.08)',
    card: 'rgba(46,51,65,0.6)',
  },
  config,
});
const {
  PRIORITIES: {HIGH_ACCURACY},
  useLocationSettings,
} = LocationEnabler;

let dataReceived = false;
const mostFrequent = arr =>
  Object.entries(
    arr.reduce((a, v) => {
      a[v] = a[v] ? a[v] + 1 : 1;
      return a;
    }, {}),
  ).reduce((a, v) => (v[1] >= a[1] ? v : a), [null, 0])[0];

const getAverage = numbers => {
  const sum = numbers.reduce((acc, number) => acc + number, 0);
  const length = numbers.length;
  return sum / length;
};

const findIcon = (icon, daily) => {
  let day;
  if (daily) {
    day = 'd';
  } else {
    day = icon.split('')[3] === 'd';
  }
  switch (icon.split('')[0]) {
    case 't':
      return require('./assets/weatherIcons/200.png');
    case 'd':
      return require('./assets/weatherIcons/300.png');
    case 'r':
      if (day) {
        return require('./assets/weatherIcons/500d.png');
      } else {
        return require('./assets/weatherIcons/500n.png');
      }
    case 's':
      return require('./assets/weatherIcons/600.png');
    case 'a':
      return require('./assets/weatherIcons/700.png');
    case 'c':
      if (icon.split('')[2] === '1' || icon.split('')[2] === '2') {
        if (day) {
          return require('./assets/weatherIcons/801d.png');
        } else {
          return require('./assets/weatherIcons/801n.png');
        }
      } else {
        return require('./assets/weatherIcons/803.png');
      }
    default:
      return require('./assets/weatherIcons/803.png');
  }
};

const App = () => {
  const [hourlyData, setHourlyData] = React.useState([]);
  const [enabled, requestResolution] = useLocationSettings(
    {
      alwaysShow: true,
    },
    false,
  );
  if (!enabled) {
    requestResolution();
  } else {
    if (!dataReceived) {
      GetLocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      })
        .then(location => {
          console.log(RAPID_API_KEY);
          axios
            .request({
              method: 'GET',
              url: 'https://weatherbit-v1-mashape.p.rapidapi.com/forecast/hourly',
              params: {
                lat: location.latitude,
                lon: location.longitude,
                lang: 'en',
                hours: '96',
                units: 'metric',
              },
              headers: {
                'X-RapidAPI-Key': RAPID_API_KEY,
                'X-RapidAPI-Host': 'weatherbit-v1-mashape.p.rapidapi.com',
              },
            })
            .then(function (response) {
              let newHD = [];
              for (let i = 0; i < 24; i++) {
                newHD.push({
                  temp: response.data.data[i].temp,
                  icon: response.data.data[i].weather.icon,
                  time: response.data.data[i].timestamp_local.split('T')[1],
                  key: i,
                });
              }
              setHourlyData(
                newHD.map(({temp, icon, time, key}) => (
                  <WeatherCard key={key} temp={temp} icon={icon} time={time} />
                )),
              );
              let checkMidnight = 0,
                hourCounter = 0,
                todayIcons = [],
                todayTemps = [],
                tomorrowIcons = [],
                tomorrowTemps = [],
                twoDaysIcons = [],
                twoDaysTemps = [],
                threeDaysIcons = [],
                threeDaysTemps = [];
              while (checkMidnight < 4 && response.data.data[hourCounter]) {
                let icon = response.data.data[hourCounter].weather.icon;
                let temp = response.data.data[hourCounter].temp;
                switch (checkMidnight) {
                  case 0:
                    todayIcons.push(icon);
                    todayTemps.push(temp);
                    break;
                  case 1:
                    tomorrowIcons.push(icon);
                    tomorrowTemps.push(temp);
                    break;
                  case 2:
                    twoDaysIcons.push(icon);
                    twoDaysTemps.push(temp);
                    break;
                  case 3:
                    threeDaysIcons.push(icon);
                    threeDaysTemps.push(temp);
                    break;
                }
                if (
                  response.data.data[hourCounter].timestamp_local.split(
                    'T',
                  )[1] === '23:00:00'
                ) {
                  checkMidnight++;
                }
                hourCounter++;
              }
              let dailyForecastArr = [
                {
                  day: 'Today',
                  icon: mostFrequent(todayIcons),
                  temp: getAverage(todayTemps),
                },
                {
                  day: 'Tomorrow',
                  icon: mostFrequent(tomorrowIcons),
                  temp: getAverage(tomorrowTemps),
                },
                {
                  day: 2,
                  icon: mostFrequent(twoDaysIcons),
                  temp: getAverage(twoDaysTemps),
                },
                {
                  day: 3,
                  icon: mostFrequent(threeDaysIcons),
                  temp: getAverage(threeDaysTemps),
                },
              ];
              dataReceived = true;
            })
            .catch(function (error) {
              console.error(error);
            });
        })
        .catch(error => {
          const {code, message} = error;
          console.warn(code, message);
        });
    }
  }
  React.useEffect(() => {
    SplashScreen.hide();
  });
  const WeatherCard = props => {
    let icon = findIcon(props.icon, false);
    return (
      <Flex
        direction={'column'}
        style={{alignItems: 'center'}}
        bg={'card'}
        w={20}
        height={32}
        rounded={'md'}
        ml={3}>
        <Text fontSize={'md'} color={'primary.50'} mt={1}>
          {props.time.substring(0, 5)}
        </Text>
        <Image source={icon} width={12} height={12} alt={'weather'} mt={3} />
        <Text fontSize={'md'} color={'primary.50'} mt={3}>
          {Math.round(props.temp)} °C
        </Text>
      </Flex>
    );
  };
  const DailyWeatherCard = () => {
    return (
      <Box bg={'card'} w={'48%'} height={40} rounded={'md'}>
        {}
      </Box>
    );
  };
  const Data = props => {
    let text = props.text;
    let data = props.data;
    if (text === 'Feels Like') {
      data = `${props.data} °C`;
    } else if (text === 'Humidity') {
      data = `${props.data} %`;
    } else if (text === 'Wind') {
      text = (
        <Box style={{position: 'relative'}}>
          <Text
            fontSize={'md'}
            color={'rgba(245,243,255,0.7)'}
            style={{textAlign: 'center'}}>
            {props.text}
          </Text>
          <Icon
            size={30}
            color={'rgba(245,243,255,0.7)'}
            name="arrow-down"
            style={{
              position: 'absolute',
              top: -5,
              right: -40,
              transform: [{rotateZ: `${20}deg`}],
            }}
          />
        </Box>
      );
      data = `${props.data} m/s`;
    } else if (text === 'Visibility') {
      data = `${props.data} km`;
    } else if (text === 'Pressure') {
      data = `${props.data} mB`;
    }
    return (
      <Flex
        direction={'column'}
        style={{alignItems: 'center'}}
        w={'48%'}
        height={'102'}>
        <Text
          fontSize={'md'}
          color={'rgba(245,243,255,0.7)'}
          style={{textAlign: 'center'}}>
          {text}
        </Text>
        <Text
          fontSize={'4xl'}
          color={'primary.50'}
          style={{textAlign: 'center'}}>
          {data}
        </Text>
      </Flex>
    );
  };
  const CardContainer = props => {
    return (
      <Flex
        direction="row"
        w="100%"
        style={{
          justifyContent: 'space-between',
          padding: 4,
          marginTop: 8,
        }}>
        {props.children}
      </Flex>
    );
  };
  return (
    <NativeBaseProvider theme={theme}>
      <StatusBar backgroundColor="#131313" barStyle={'light-content'} />
      <ScrollView w="100%" h={'100%'} showsVerticalScrollIndicator={false}>
        <Flex
          direction="column"
          height={'100%'}
          bg={'primary.900'}
          style={{alignItems: 'center'}}>
          <Box width={'100%'} mt={20} style={{position: 'relative'}}>
            <Icon
              size={30}
              color={'#f5f3ff'}
              name="location-sharp"
              style={{position: 'absolute', left: 4, top: 0}}
            />
            <Text fontSize="xl" color={'primary.50'} ml={10}>
              City
            </Text>
          </Box>
          <Image
            mt={90}
            source={require('./assets/weatherIcons/800d.png')}
            width={160}
            height={160}
            alt={'weather'}
          />
          <Box mt={50}>
            <Text color={'primary.100'} fontSize={'md'}>
              Sunny
            </Text>
          </Box>
          <Box mt={2}>
            <Heading color={'primary.100'} size="4xl">
              20
            </Heading>
            <Text
              color={'primary.100'}
              fontSize="4xl"
              style={{position: 'absolute', right: -15}}>
              °
            </Text>
          </Box>
          <ScrollView
            w="100%"
            mt={20}
            horizontal={true}
            showsHorizontalScrollIndicator={false}>
            {hourlyData}
          </ScrollView>
          <Flex
            direction={'column'}
            w={'100%'}
            style={{alignItems: 'center'}}
            mt={14}>
            <CardContainer>
              <DailyWeatherCard />
              <DailyWeatherCard />
            </CardContainer>
            <CardContainer>
              <DailyWeatherCard />
              <DailyWeatherCard />
            </CardContainer>
          </Flex>
          <Box mt={18} mb={20}>
            <CardContainer>
              <Data text={'Feels Like'} data={32} />
              <Data text={'Humidity'} data={67} />
            </CardContainer>
            <CardContainer>
              <Data text={'Wind'} data={13} />
              <Data text={'UV Index'} data={7} />
            </CardContainer>
            <CardContainer>
              <Data text={'Visibility'} data={14} />
              <Data text={'Pressure'} data={1012} />
            </CardContainer>
          </Box>
        </Flex>
      </ScrollView>
    </NativeBaseProvider>
  );
};
export default App;
