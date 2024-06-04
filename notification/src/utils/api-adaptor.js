import config from '../config/config.js'


async function callPaydock(url, data, httpMethod) {
  const apiUrl = await config.getPaydockApiUrl() + url
  const paydockCredentials = await config.getPaydockConfig('connection')
  let requestHeaders = {}
  if (paydockCredentials.credentials_type === 'credentials') {
    requestHeaders = {
      'X-Commercetools-Meta': 'V1.0.0_commercetools',
      'Content-Type': 'application/json',
      'x-user-secret-key': paydockCredentials.credentials_secret_key
    }
  } else {
    requestHeaders = {
      'X-Commercetools-Meta': 'V1.0.0_commercetools',
      'Content-Type': 'application/json',
      'x-access-token': paydockCredentials.credentials_access_key
    }
  }
  const requestOptions = {
    method: httpMethod,
    headers: requestHeaders
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
  callPaydock
}
