import config from '../config/config.js'


async function callPowerboard(url, data, httpMethod) {
  const apiUrl = await config.getPowerboardApiUrl() + url
  const powerboardCredentials = await config.getPowerboardConfig('connection')
  const requestOptions = {
    method: httpMethod,
    headers: {
      'Content-Type': 'application/json',
      'x-user-secret-key': powerboardCredentials.credentials_secret_key
    }
  };
  if (httpMethod !== 'GET' && data) {
     requestOptions.body = JSON.stringify(data); // Ensure the body is stringified for POST requests
  }


  try {
    const response = await fetch(apiUrl, requestOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const responseData = await response.json();
    return responseData?.resource?.data ?? {};
  } catch (error) {
    console.error("Error fetching data: ", error);
    return {};
  }
}

export default {
  callPowerboard
}
