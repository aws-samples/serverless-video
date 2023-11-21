exports.handler = async (event, context, callback) => {

  if (event.triggerSource == 'PreSignUp_SignUp') {
    const userEmailDomain = event.request.userAttributes.email.split("@")[1];
    const allowedDomains = ['amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 'amazon.es', 'amazon.it', 'amazon.co.jp', 'amazon.cn', 'amazon.com.br', 'amazon.com.mx', 'amazon.com.au', 'amazon.in', 'amazon.ae', 'amazon.sa'];

    if (allowedDomains.includes(userEmailDomain)) {
      callback(null, event);
    } else {
      const error = new Error(`Sorry, you need an Amazon domain email address to use this service`);
      callback(error, event);
    }
  } else {
    callback(null, event);
  }
}
