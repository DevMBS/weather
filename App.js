/**

 * @format
 * @flow strict-local
 */

//imports
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

//you can set your rapid api key in .env file
import {RAPID_API_KEY} from '@env';

//set transparent navbar
SystemNavigationBar.setNavigationColor('hsla(0,0%,0%,0)');

// Define the config for theme
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

//geolocation settings
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
  //get average of an array of numbers
  const sum = numbers.reduce((acc, number) => acc + number, 0);
  const length = numbers.length;
  return sum / length;
};

const findIcon = (icon, daily) => {
  //find icon name in assets
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
      if (icon.split('')[2] === '1') {
        if (day) {
          return require('./assets/weatherIcons/800d.png');
        } else {
          return require('./assets/weatherIcons/800n.png');
        }
      } else if (icon.split('')[2] === '2') {
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

const daysOfWeek = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
let locationEnabled = false;

const App = () => {
  //define sections
  const [hourlyData, setHourlyData] = React.useState([]);
  const [dailyForecast, setDailyForecast] = React.useState();
  //define data
  const [city, setCity] = React.useState();
  const [currentIcon, setCurrentIcon] = React.useState();
  const [desc, setDesc] = React.useState();
  const [currentTemp, setCurrentTemp] = React.useState();
  const [feelsLike, setFeelsLike] = React.useState();
  const [humidity, setHumidity] = React.useState();
  const [windSpeed, setWindSpeed] = React.useState();
  const [windDirection, setWindDirection] = React.useState(0);
  const [uv, setUV] = React.useState();
  const [visibility, setVisibility] = React.useState();
  const [pressure, setPressure] = React.useState();

  //GPS enable request
  const [enabled, requestResolution] = useLocationSettings(
    {
      alwaysShow: true,
    },
    false,
  );
  if (!enabled) {
    if (!locationEnabled) {
      requestResolution();
      locationEnabled = true;
    }
  } else {
    if (!dataReceived) {
      //get current geolocation and call weatherbit api
      GetLocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      })
        .then(location => {
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
              //handle response
              //array of hourly weather cards
              let newHD = [];
              for (let i = 0; i < 24; i++) {
                //push to this array temperature, icon and time from api
                newHD.push({
                  temp: response.data.data[i].temp,
                  icon: response.data.data[i].weather.icon,
                  time: response.data.data[i].timestamp_local.split('T')[1],
                  key: i,
                });
              }
              //display it
              setHourlyData(
                newHD.map(({temp, icon, time, key}) => (
                  <WeatherCard key={key} temp={temp} icon={icon} time={time} />
                )),
              );
              //vars for daily weather cards
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
              let twoWeekDay = false;
              let threeWeekDay = false;

              //create daily weather cards
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
                    if (!twoWeekDay) {
                      twoWeekDay =
                        daysOfWeek[
                          new Date(
                            response.data.data[
                              hourCounter
                            ].timestamp_local.split('T')[0],
                          ).getDay()
                        ];
                    }
                    twoDaysIcons.push(icon);
                    twoDaysTemps.push(temp);
                    break;
                  case 3:
                    if (!threeWeekDay) {
                      threeWeekDay =
                        daysOfWeek[
                          new Date(
                            response.data.data[
                              hourCounter
                            ].timestamp_local.split('T')[0],
                          ).getDay()
                        ];
                    }
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
              //display daily weather cards
              setDailyForecast(
                <Flex
                  direction={'column'}
                  w={'100%'}
                  style={{alignItems: 'center'}}
                  mt={14}>
                  <CardContainer>
                    <DailyWeatherCard
                      day={'Today'}
                      icon={mostFrequent(todayIcons)}
                      temp={Math.round(getAverage(todayTemps))}
                    />
                    <DailyWeatherCard
                      day={'Tomorrow'}
                      icon={mostFrequent(tomorrowIcons)}
                      temp={Math.round(getAverage(tomorrowTemps))}
                    />
                  </CardContainer>
                  <CardContainer>
                    <DailyWeatherCard
                      day={twoWeekDay}
                      icon={mostFrequent(twoDaysIcons)}
                      temp={Math.round(getAverage(twoDaysTemps))}
                    />
                    <DailyWeatherCard
                      day={threeWeekDay}
                      icon={mostFrequent(threeDaysIcons)}
                      temp={Math.round(getAverage(threeDaysTemps))}
                    />
                  </CardContainer>
                </Flex>,
              );

              //display current weather data
              setCity(response.data.city_name);
              setCurrentIcon(
                <Image
                  mt={90}
                  source={findIcon(response.data.data[0].weather.icon, false)}
                  width={160}
                  height={160}
                  alt={'weather'}
                />,
              );
              setDesc(response.data.data[0].weather.description);
              setCurrentTemp(Math.round(response.data.data[0].temp));
              setFeelsLike(Math.round(response.data.data[0].app_temp));
              setHumidity(response.data.data[0].rh);
              setWindSpeed(Math.round(response.data.data[0].wind_spd));
              setWindDirection(response.data.data[0].wind_dir);
              setUV(Math.round(response.data.data[0].uv));
              setVisibility(Math.round(response.data.data[0].vis));
              setPressure(Math.round(response.data.data[0].pres));
            })
            .catch(function (error) {
              console.error(error);
            });
        })
        .catch(error => {
          const {code, message} = error;
          console.warn(code, message);
        });
      dataReceived = true;
    }
  }
  //hide splash screen
  React.useEffect(() => {
    if (pressure) {
      SplashScreen.hide();
    }
  });

  //hourly weather card
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

  //daily weather card
  const DailyWeatherCard = props => {
    return (
      <Box
        bg={'rgba(46,51,65,0.2)'}
        w={'48%'}
        height={40}
        rounded={'md'}
        pt={2}
        pb={2}
        pl={1}
        pr={1}>
        <Flex direction={'row'}>
          <Image
            source={findIcon(props.icon, true)}
            width={20}
            height={20}
            alt={'weather'}
          />
          <Text
            fontSize={'4xl'}
            color={'primary.50'}
            style={{position: 'absolute', top: 15, right: 1}}>
            {props.temp}°
          </Text>
        </Flex>
        <Text w={'100%'} fontSize={'xl'} style={{textAlign: 'center'}} mt={8}>
          {props.day}
        </Text>
      </Box>
    );
  };

  //current weather data element
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
              transform: [{rotateZ: `${windDirection}deg`}],
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

  //daily weather card container
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
              {city}
            </Text>
          </Box>
          {currentIcon}
          <Box mt={50}>
            <Text color={'primary.100'} fontSize={'md'}>
              {desc}
            </Text>
          </Box>
          <Box mt={2}>
            <Heading color={'primary.100'} size="4xl">
              {currentTemp}
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
          {dailyForecast}
          <Box mt={18} mb={20}>
            <CardContainer>
              <Data text={'Feels Like'} data={feelsLike} />
              <Data text={'Humidity'} data={humidity} />
            </CardContainer>
            <CardContainer>
              <Data text={'Wind'} data={windSpeed} />
              <Data text={'UV Index'} data={uv} />
            </CardContainer>
            <CardContainer>
              <Data text={'Visibility'} data={visibility} />
              <Data text={'Pressure'} data={pressure} />
            </CardContainer>
          </Box>
        </Flex>
      </ScrollView>
    </NativeBaseProvider>
  );
};
export default App;
