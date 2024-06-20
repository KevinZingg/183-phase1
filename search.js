const axios = require('axios');
const querystring = require('querystring');
const validator = require('validator');

async function getHtml(req) {
    if (!req.body.provider || !req.body.terms || !req.body.userid) {
        return "Not enough information provided";
    }

    let provider = validator.escape(req.body.provider);
    let terms = validator.escape(req.body.terms);
    let userid = validator.escape(req.body.userid);

    await sleep(1000); // this is a long, long search!!

    let theUrl = `http://localhost:3000${provider}?userid=${userid}&terms=${terms}`;
    let result = await callAPI('GET', theUrl, false);
    return result;
}

async function callAPI(method, url, data) {
    let noResults = 'No results found!';
    let result;

    try {
        switch (method) {
            case "POST":
                result = data ? await axios.post(url, data) : await axios.post(url);
                break;
            case "PUT":
                result = data ? await axios.put(url, data) : await axios.put(url);
                break;
            default:
                if (data) url = url + '?' + querystring.stringify(data);
                result = await axios.get(url);
        }
        return result.data;
    } catch (error) {
        console.error('API call error:', error);
        return noResults;
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

module.exports = { html: getHtml };
