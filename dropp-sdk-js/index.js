/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/dropp-client.ts":
/*!*****************************!*\
  !*** ./src/dropp-client.ts ***!
  \*****************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.DroppClient = void 0;\nconst dropp_http_client_1 = __webpack_require__(/*! ./dropp-http-client */ \"./src/dropp-http-client.ts\");\nconst dropp_log_1 = __webpack_require__(/*! ./dropp-log */ \"./src/dropp-log.ts\");\nconst dropp_sdk_version_1 = __webpack_require__(/*! ./dropp-sdk-version */ \"./src/dropp-sdk-version.ts\");\nconst dropp_response_1 = __webpack_require__(/*! ./dropp-response */ \"./src/dropp-response.ts\");\n/**\n * The main entry point\n */\nclass DroppClient {\n    /**\n     * @param env SANDBOX/PROD/.. from DroppEnvironment\n     */\n    constructor(env) {\n        this.env = env;\n        this.droppHttpClient = new dropp_http_client_1._DroppHttpClient(env);\n        (0, dropp_log_1.droppLog)(`Version: ${dropp_sdk_version_1.DROPP_SDK_VERSION}`);\n        (0, dropp_log_1.droppLog)(`Environment: ${this.env}`);\n    }\n    /**\n     * Fetch network members for a merchant.\n     * @param primaryMerchantAccountId Merchant account ID\n     * @param request APINetworkMembersRequest object\n     * @param signingKey EdDSA signing key (hex)\n     */\n    postToDroppService(url, postData) {\n        return __awaiter(this, void 0, void 0, function* () {\n            return yield this.droppHttpClient.postToDroppService(url, postData);\n        });\n    }\n    generateUUID(paymentRequestData) {\n        return __awaiter(this, void 0, void 0, function* () {\n            const reqData = { qr_type: (paymentRequestData.invoiceType === \"PREAUTH\" ? \"PREAUTH\" : \"PAY_REQUEST\"), data: paymentRequestData };\n            const paymentUrl = \"/api/walletext/v1/qrcode/generateUUID\";\n            const response = yield this.droppHttpClient.postToDroppService(paymentUrl, JSON.stringify({ data: JSON.stringify(reqData) }));\n            const uuid = response.data;\n            return new dropp_response_1.DroppResponse(response.responseCode, response.errors, {\n                link: `${this.env === \"QA\" ? 'https://dropp.test-app.link' : 'https://dropp.app.link'}/${this.env === \"SANDBOX\" ? \"sandbox/\" : \"\"}checkDroppApp?uuid=${uuid}`,\n                uuid: uuid\n            });\n        });\n    }\n    waitForCompletion(uuid_1) {\n        return __awaiter(this, arguments, void 0, function* (uuid, retries = 10, interval = 3000) {\n            // const pollUrl = `/api/walletext/v1/qrcode/getStatusForUUID?uuid=${uuid}`;\n            const pollUrl = `/api/walletext/v1/qrcode/def/getStatus?uuid=${uuid}`;\n            return yield this.pollForCompletion(pollUrl, retries, interval);\n        });\n    }\n    getUrlForSubMerchantAuthorization(parentMerchantAccountId) {\n        const url = this.getMPSUrl(this.env);\n        return `${url}/app/authorize/${parentMerchantAccountId}`;\n    }\n    pollForCompletion(pollUrl, retries, interval) {\n        return __awaiter(this, void 0, void 0, function* () {\n            for (let attempts = 0; attempts < retries; attempts++) {\n                try {\n                    const response = yield this.droppHttpClient.getStatusForUUID(pollUrl);\n                    (0, dropp_log_1.droppLog)(`Polling attempt ${attempts + 1}: Response: ${JSON.stringify(response)}`);\n                    if (response && response.responseCode === 0 && response.data === \"SUCCESS\") {\n                        return response; // Return successful response\n                    }\n                    if (attempts === retries - 1) {\n                        return response; // Return the last response if retries exhausted\n                    }\n                }\n                catch (error) {\n                    (0, dropp_log_1.droppLog)(`Error in getStatusForUUID: ${error}`);\n                }\n                // Wait for the interval before retrying\n                yield new Promise(resolve => setTimeout(resolve, interval));\n            }\n            throw new Error(`Polling failed after ${retries} attempts.`);\n        });\n    }\n    getMPSUrl(envName) {\n        if (envName === \"PROD\") {\n            return \"https://merchant.portal.dropp.cc\";\n        }\n        else if (envName === \"QA\") {\n            return \"https://merchantportal.qa.dropp.cc\";\n        }\n        else if (envName === \"SANDBOX\") {\n            return \"https://sandbox.merchantportal.dropp.cc\";\n        }\n        else {\n            throw \"Unknown Environment for MPS URL\";\n        }\n    }\n}\nexports.DroppClient = DroppClient;\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-client.ts?\n}");

/***/ }),

/***/ "./src/dropp-credit-payment-request.ts":
/*!*********************************************!*\
  !*** ./src/dropp-credit-payment-request.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.DroppCreditPaymentRequest = void 0;\nconst dropp_signature_generator_1 = __webpack_require__(/*! ./dropp-signature-generator */ \"./src/dropp-signature-generator.ts\");\nclass DroppCreditPaymentRequest {\n    constructor(droppHttpClient) {\n        this.droppClient = droppHttpClient;\n    }\n    submit(redemptionData, signingKey) {\n        return __awaiter(this, void 0, void 0, function* () {\n            const paymentUrl = \"/merchant/processRequest\";\n            const base64Json = Buffer.from(JSON.stringify(redemptionData)).toString(\"base64\");\n            // signature input: stringifiedJsonData -> base64 -> hex\n            const merchantSignature = dropp_signature_generator_1.DroppSignatureGenerator.generateMerchantSignature(Buffer.from(base64Json).toString(\"hex\"), signingKey);\n            const postData = {\n                methodName: \"creditToUser\",\n                base64JsonContent: base64Json,\n                signature: merchantSignature\n            };\n            return yield this.droppClient.postToDroppService(paymentUrl, postData);\n        });\n    }\n}\nexports.DroppCreditPaymentRequest = DroppCreditPaymentRequest;\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-credit-payment-request.ts?\n}");

/***/ }),

/***/ "./src/dropp-environment.ts":
/*!**********************************!*\
  !*** ./src/dropp-environment.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, exports) => {

eval("{\nvar _a;\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.DroppEnvironment = void 0;\nclass DroppEnvironment {\n    constructor(name, url) {\n        this._name = name;\n        this._url = url;\n    }\n    static get(envName) {\n        const url = this.envBaseUrls.get(envName);\n        if (url) {\n            return new _a(envName, url);\n        }\n        throw \"Unknown Environment\";\n    }\n    get name() {\n        return this._name;\n    }\n    get url() {\n        return this._url;\n    }\n}\nexports.DroppEnvironment = DroppEnvironment;\n_a = DroppEnvironment;\nDroppEnvironment.envBaseUrls = new Map([\n    [\"SANDBOX\", \"https://sandbox.api.dropp.cc\"],\n    [\"PROD\", \"https://api.dropp.cc\"]\n]);\n(() => {\n    if (true) {\n        _a.envBaseUrls.set(\"QA\", \"https://main.qa.dropp.cc\");\n    }\n})();\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-environment.ts?\n}");

/***/ }),

/***/ "./src/dropp-http-client.ts":
/*!**********************************!*\
  !*** ./src/dropp-http-client.ts ***!
  \**********************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports._DroppHttpClient = void 0;\nconst dropp_environment_1 = __webpack_require__(/*! ./dropp-environment */ \"./src/dropp-environment.ts\");\nconst axios_1 = __webpack_require__(/*! axios */ \"axios\");\nconst dropp_sdk_version_1 = __webpack_require__(/*! ./dropp-sdk-version */ \"./src/dropp-sdk-version.ts\");\nconst dropp_response_1 = __webpack_require__(/*! ./dropp-response */ \"./src/dropp-response.ts\");\nconst dropp_log_1 = __webpack_require__(/*! ./dropp-log */ \"./src/dropp-log.ts\");\nconst os = __webpack_require__(/*! os */ \"os\");\nclass _DroppHttpClient {\n    constructor(env) {\n        this.environment = dropp_environment_1.DroppEnvironment.get(env);\n        this.axiosInstance = axios_1.default.create({\n            baseURL: this.environment.url,\n            timeout: 30000, // 30 seconds timeout\n        });\n        this.axiosInstance.defaults.headers.common['User-Agent'] = this.generateUserAgentString();\n        //todo add ip address here and/or to post data\n        this.axiosInstance.interceptors.request.use(function (config) {\n            // Do something before request is sent\n            // droppLog(\"request config: \" + JSON.stringify(config));\n            if (config.headers) {\n                // If headers is an AxiosHeaders instance, use set method\n                if (typeof config.headers.set === 'function') {\n                    config.headers.set('Content-Type', 'application/json');\n                }\n                else {\n                    // Otherwise, set directly\n                    config.headers['Content-Type'] = \"application/json\";\n                }\n            }\n            return config;\n        }, function (error) {\n            // Do something with request error\n            // droppLog(\"Request Error\");\n            // console.log(error);\n            return Promise.reject(error);\n        });\n        this.axiosInstance.interceptors.response.use(function (response) {\n            // special handling for RPS calls, since it doesn't follow the response pattern of\n            // {  responseCode, errors, data }\n            // droppLog(\"response\");\n            // console.log(response);\n            if (_DroppHttpClient.isRpsP2pApi(response)) {\n                response = _DroppHttpClient.transformRpsP2pResponse(response);\n            }\n            else if (_DroppHttpClient.isRpsAuthApi(response)) {\n                response = _DroppHttpClient.transformRpsAuthResponse(response);\n            }\n            // else do nothing; pass as-is\n            return response;\n        }, function (error) {\n            // droppLog(\"Response Error\");\n            // console.log(error);\n            return Promise.reject(error);\n        });\n    }\n    static isRpsAuthApi(response) {\n        return response.config.url === \"/api/rps/v1/payments\";\n    }\n    static transformRpsAuthResponse(response) {\n        if (_DroppHttpClient.isRpsAuthApi(response)) {\n            const dataFromServer = response.data;\n            response.data = {\n                responseCode: 0,\n                errors: [],\n                data: {\n                    /* can we do better? Maybe automatically include key-value pairs. */\n                    recurringToken: dataFromServer.value\n                }\n            };\n        }\n        return response;\n    }\n    static isRpsP2pApi(response) {\n        return response.config.url === \"/api/rps/v1/payments/p2p\";\n    }\n    static transformRpsP2pResponse(response) {\n        if (_DroppHttpClient.isRpsP2pApi(response)) {\n            const dataFromServer = response.data;\n            response.data = {\n                responseCode: 0,\n                errors: [],\n                /* can we do better? */\n                data: dataFromServer.paymentData /* this is p2p object from server */\n            };\n        }\n        return response;\n    }\n    generateUserAgentString() {\n        const product = \"DroppSdkJs\";\n        const productVersion = dropp_sdk_version_1.DROPP_SDK_VERSION;\n        const systemInformation = '(' + os.type() + ')';\n        return product + '/' + productVersion + ' ' + systemInformation;\n    }\n    postToDroppService(url, postData) {\n        return __awaiter(this, void 0, void 0, function* () {\n            let serverResponse;\n            yield this.axiosInstance.post(url, postData)\n                .then(function (response) {\n                (0, dropp_log_1.droppLog)('Response received');\n                serverResponse = response;\n            })\n                .catch(function (errorResponse) {\n                (0, dropp_log_1.droppLog)(`Error`);\n                if (errorResponse.response.data) {\n                    // Server returned an error response with data\n                    const errorData = errorResponse.response.data;\n                    // Check if it's an MpsException or other server error\n                    if (errorResponse.response.status === 400 || errorResponse.response.status === 401 || errorResponse.response.status === 403) {\n                        // Invalid signature or authentication errors typically return 400/401/403\n                        throw new Error(JSON.stringify({\n                            error: \"MpsException - Invalid signature or authentication failed\",\n                            details: errorData\n                        }));\n                    }\n                    throw new Error(JSON.stringify(errorResponse.response.data));\n                }\n                else {\n                    const err = JSON.parse(JSON.stringify(errorResponse));\n                    if (err.status) {\n                        throw new Error(JSON.stringify({\n                            \"code\": err.code,\n                            \"status\": err.status,\n                            \"message\": err.message\n                        }));\n                    }\n                    else {\n                        throw new Error(\"Unknown error response\");\n                    }\n                }\n            });\n            if (serverResponse.data) {\n                const responseData = serverResponse.data;\n                return new dropp_response_1.DroppResponse(responseData.responseCode, responseData.errors, responseData.data);\n            }\n            else {\n                // not a DroppResponse\n                throw new Error(\"Unknown response\");\n            }\n        });\n    }\n    getStatusForUUID(url) {\n        return __awaiter(this, void 0, void 0, function* () {\n            let serverResponse;\n            try {\n                serverResponse = yield this.axiosInstance.get(url);\n            }\n            catch (errorResponse) {\n                (0, dropp_log_1.droppLog)(`Error`);\n                console.error(errorResponse);\n                // if (errorResponse.response.data) {\n                //     throw new Error(JSON.stringify(errorResponse.response.data));\n                // } else {\n                //     const err = JSON.parse(JSON.stringify(errorResponse));\n                //     if (err.status) {\n                //         throw new Error(JSON.stringify({\n                //             \"code\": err.code,\n                //             \"status\": err.status,\n                //             \"message\": err.message\n                //         }));\n                //     } else {\n                //         throw new Error(\"Unknown error response\");\n                //     }\n                // }\n            }\n            if (serverResponse.data) {\n                const responseData = serverResponse.data;\n                return new dropp_response_1.DroppResponse(responseData.responseCode, responseData.errors, responseData.data);\n            }\n            else {\n                // not a DroppResponse\n                throw new Error(\"Unknown response\");\n            }\n        });\n    }\n}\nexports._DroppHttpClient = _DroppHttpClient;\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-http-client.ts?\n}");

/***/ }),

/***/ "./src/dropp-log.ts":
/*!**************************!*\
  !*** ./src/dropp-log.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("{\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.droppLog = droppLog;\nconst dropp_sdk_version_1 = __webpack_require__(/*! ./dropp-sdk-version */ \"./src/dropp-sdk-version.ts\");\nfunction droppLog(message) {\n    console.log(`    - [${dropp_sdk_version_1.DROPP_SDK_NAME}] ${message}`);\n}\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-log.ts?\n}");

/***/ }),

/***/ "./src/dropp-network-member-request.ts":
/*!*********************************************!*\
  !*** ./src/dropp-network-member-request.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.DroppNetworkMemberRequest = void 0;\nconst dropp_signature_generator_1 = __webpack_require__(/*! ./dropp-signature-generator */ \"./src/dropp-signature-generator.ts\");\nclass DroppNetworkMemberRequest {\n    constructor(droppHttpClient) {\n        this.droppClient = droppHttpClient;\n    }\n    getNetworkMembers(requestParameters, parentMerchantAccountId, signingKey) {\n        return __awaiter(this, void 0, void 0, function* () {\n            const signature = dropp_signature_generator_1.DroppSignatureGenerator.generateSignatureForData(Object.assign({}, requestParameters), signingKey);\n            return this.fetchNetworkMembers(requestParameters, parentMerchantAccountId, signature);\n        });\n    }\n    fetchNetworkMembers(requestParameters, parentMerchantAccountId, signature) {\n        return __awaiter(this, void 0, void 0, function* () {\n            const paymentUrl = `/api/v1/merchants/${parentMerchantAccountId}/getNetworkMembers`;\n            const postData = {\n                base64JsonContent: Buffer.from(JSON.stringify(requestParameters)).toString('base64'),\n                signature: signature\n            };\n            return yield this.droppClient.postToDroppService(paymentUrl, postData);\n        });\n    }\n}\nexports.DroppNetworkMemberRequest = DroppNetworkMemberRequest;\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-network-member-request.ts?\n}");

/***/ }),

/***/ "./src/dropp-payloads.ts":
/*!*******************************!*\
  !*** ./src/dropp-payloads.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, exports) => {

eval("{\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.PromiseToPay = void 0;\nclass PromiseToPay {\n    constructor(p2p) {\n        this.payer = p2p.payer;\n        this.invoiceBytes = p2p.invoiceBytes;\n        this.timeStamp = p2p.timeStamp;\n        this.signatures = p2p.signatures;\n        this.distributionBytes = p2p.distributionBytes;\n        this.encodedHHTransfer = p2p.encodedHHTransfer;\n        this.purchaseURL = p2p.purchaseURL;\n        this.shareURL = p2p.shareURL;\n        this.walletCurrency = p2p.walletCurrency;\n        this.exchangeRate = p2p.exchangeRate; // exchange rate for the payment, if applicable\n        this.droppCredits = p2p.droppCredits; // total Dropp credits used in the payment\n        this.droppCreditsInInvoiceCurrency = p2p.droppCreditsInInvoiceCurrency; // Dropp credits in the invoice currency\n        this.droppCreditsInWalletCurrency = p2p.droppCreditsInWalletCurrency;\n    }\n    decodeDistributionBytes() {\n        if (this.distributionBytes) {\n            const d = Buffer.from(this.distributionBytes, \"base64\").toString(\"utf-8\");\n            return JSON.parse(d);\n        }\n        return undefined;\n    }\n    decodeInvoiceBytes() {\n        const i = Buffer.from(this.invoiceBytes, \"base64\").toString(\"utf-8\");\n        return JSON.parse(i);\n    }\n}\nexports.PromiseToPay = PromiseToPay;\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-payloads.ts?\n}");

/***/ }),

/***/ "./src/dropp-payment-request.ts":
/*!**************************************!*\
  !*** ./src/dropp-payment-request.ts ***!
  \**************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.DroppPaymentRequest = void 0;\nconst dropp_signature_generator_1 = __webpack_require__(/*! ./dropp-signature-generator */ \"./src/dropp-signature-generator.ts\");\nclass DroppPaymentRequest {\n    constructor(droppHttpClient) {\n        this.droppClient = droppHttpClient;\n    }\n    submit(promiseToPay, signingKey) {\n        return __awaiter(this, void 0, void 0, function* () {\n            promiseToPay.signatures.merchant = dropp_signature_generator_1.DroppSignatureGenerator.generateMerchantSignature(promiseToPay.signatures.payer, signingKey);\n            return this.submitForPayment(promiseToPay);\n        });\n    }\n    submitForSubMerchant(promiseToPay, signingKey, parentMerchantAccountId) {\n        return __awaiter(this, void 0, void 0, function* () {\n            promiseToPay.signatures.merchant = dropp_signature_generator_1.DroppSignatureGenerator.generateMerchantSignature(promiseToPay.signatures.payer, signingKey);\n            return this.submitForSubMerchantPayment(promiseToPay, parentMerchantAccountId);\n        });\n    }\n    submitForPayment(promiseToPay) {\n        return __awaiter(this, void 0, void 0, function* () {\n            const paymentUrl = \"/payment/processRequest\";\n            const postData = {\n                methodName: \"payMerchantV2\", paymentData: promiseToPay\n            };\n            return yield this.droppClient.postToDroppService(paymentUrl, postData);\n        });\n    }\n    submitForSubMerchantPayment(promiseToPay, parentMerchantAccountId) {\n        return __awaiter(this, void 0, void 0, function* () {\n            const paymentUrl = `/api/v1/merchants/${parentMerchantAccountId}/processRequest`;\n            // let postData = {\n            //     p2p: promiseToPay\n            // };\n            console.log(\"Post data for sub-merchant payment:\", promiseToPay);\n            return yield this.droppClient.postToDroppService(paymentUrl, promiseToPay);\n        });\n    }\n}\nexports.DroppPaymentRequest = DroppPaymentRequest;\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-payment-request.ts?\n}");

/***/ }),

/***/ "./src/dropp-preauth-payment-request.ts":
/*!**********************************************!*\
  !*** ./src/dropp-preauth-payment-request.ts ***!
  \**********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.DroppPreAuthPaymentRequest = void 0;\nconst dropp_signature_generator_1 = __webpack_require__(/*! ./dropp-signature-generator */ \"./src/dropp-signature-generator.ts\");\nconst dropp_response_1 = __webpack_require__(/*! ./dropp-response */ \"./src/dropp-response.ts\");\nconst dropp_log_1 = __webpack_require__(/*! ./dropp-log */ \"./src/dropp-log.ts\");\nclass DroppPreAuthPaymentRequest {\n    constructor(droppHttpClient) {\n        this.droppClient = droppHttpClient;\n    }\n    submitForAuthorization(payload, signingKey) {\n        return __awaiter(this, void 0, void 0, function* () {\n            // Step 1: get authorization token\n            payload.signatures.merchant = dropp_signature_generator_1.DroppSignatureGenerator.generateMerchantSignature(payload.signatures.payer, signingKey);\n            const url = \"/api/rps/v1/payments/preAuth\";\n            (0, dropp_log_1.droppLog)(`url: ${url}`);\n            (0, dropp_log_1.droppLog)(JSON.stringify(payload));\n            payload.dataInBase64 = payload.data;\n            (0, dropp_log_1.droppLog)(`AFter: ${JSON.stringify(payload)}`);\n            let responsefinal;\n            try {\n                responsefinal = yield this.droppClient.postToDroppService(url, payload);\n            }\n            catch (error) {\n                (0, dropp_log_1.droppLog)(`Error while getting Authorization Token: ${error}`);\n                const e = JSON.parse(error.message);\n                responsefinal = new dropp_response_1.DroppResponse(e.errorCode, [e.message], {});\n            }\n            return responsefinal;\n        });\n    }\n    submitSubMerchantForAuthorization(payload, signingKey) {\n        return __awaiter(this, void 0, void 0, function* () {\n            // Step 1: get authorization token\n            payload.signatures.merchant = dropp_signature_generator_1.DroppSignatureGenerator.generateMerchantSignature(payload.signatures.payer, signingKey);\n            const url = \"/api/rps/v1/payments/preAuthSubMerchant\";\n            (0, dropp_log_1.droppLog)(`url: ${url}`);\n            (0, dropp_log_1.droppLog)(JSON.stringify(payload));\n            payload.dataInBase64 = payload.data;\n            (0, dropp_log_1.droppLog)(`AFter: ${JSON.stringify(payload)}`);\n            let responsefinal;\n            try {\n                responsefinal = yield this.droppClient.postToDroppService(url, payload);\n            }\n            catch (error) {\n                (0, dropp_log_1.droppLog)(`Error while getting Authorization Token: ${error}`);\n                const e = JSON.parse(error.message);\n                responsefinal = new dropp_response_1.DroppResponse(e.errorCode, [e.message], {});\n            }\n            return responsefinal;\n        });\n    }\n    submitForPayment(paymentDueData, signingKey) {\n        return __awaiter(this, void 0, void 0, function* () {\n            // Step 2: sign and submit to get p2p\n            // Step 3: then, sign and submit p2p to process payment\n            // STEP 2: sign and submit to get p2p\n            const base64Json = Buffer.from(JSON.stringify(paymentDueData)).toString(\"base64\");\n            const merchantSignature = dropp_signature_generator_1.DroppSignatureGenerator.generateMerchantSignature(Buffer.from(JSON.stringify(paymentDueData)).toString(\"hex\"), signingKey);\n            const payload = {\n                signatures: { merchant: merchantSignature },\n                dataInBase64: base64Json\n            };\n            const url = \"/api/rps/v1/payments/p2p\";\n            let response;\n            let p2p;\n            try {\n                response = yield this.droppClient.postToDroppService(url, payload);\n                if (response && response.responseCode == 0 && !response.data) {\n                    return response;\n                }\n                p2p = response.data;\n                console.log(\"Getting P2P from the token : \", p2p);\n                // STEP 3: then, sign and submit p2p to process payment\n                return this.submit(p2p, signingKey);\n            }\n            catch (error) {\n                console.error(\"Error while getting P2P:\", error);\n                throw error;\n            }\n        });\n    }\n    submit(promiseToPay, signingKey) {\n        return __awaiter(this, void 0, void 0, function* () {\n            promiseToPay.signatures.merchant = dropp_signature_generator_1.DroppSignatureGenerator.generateMerchantSignature(promiseToPay.signatures.dropp, signingKey);\n            const url = \"/api/rps/v1/payments/p2p/process\";\n            return yield this.droppClient.postToDroppService(url, promiseToPay);\n        });\n    }\n}\nexports.DroppPreAuthPaymentRequest = DroppPreAuthPaymentRequest;\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-preauth-payment-request.ts?\n}");

/***/ }),

/***/ "./src/dropp-recurring-payment-request.ts":
/*!************************************************!*\
  !*** ./src/dropp-recurring-payment-request.ts ***!
  \************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.DroppRecurringPaymentRequest = void 0;\nconst dropp_signature_generator_1 = __webpack_require__(/*! ./dropp-signature-generator */ \"./src/dropp-signature-generator.ts\");\nconst dropp_log_1 = __webpack_require__(/*! ./dropp-log */ \"./src/dropp-log.ts\");\nclass DroppRecurringPaymentRequest {\n    constructor(droppHttpClient) {\n        this.droppClient = droppHttpClient;\n    }\n    submitForAuthorization(payload, signingKey) {\n        return __awaiter(this, void 0, void 0, function* () {\n            // Step 1: get authorization token\n            payload.signatures.merchant = dropp_signature_generator_1.DroppSignatureGenerator.generateMerchantSignature(payload.signatures.payer, signingKey);\n            const url = \"/api/rps/v1/payments\";\n            (0, dropp_log_1.droppLog)(`url: ${url}`);\n            (0, dropp_log_1.droppLog)(JSON.stringify(payload));\n            payload.dataInBase64 = payload.data;\n            (0, dropp_log_1.droppLog)(`AFter: ${JSON.stringify(payload)}`);\n            return yield this.droppClient.postToDroppService(url, payload);\n        });\n    }\n    submitForPayment(paymentDueData, signingKey) {\n        return __awaiter(this, void 0, void 0, function* () {\n            // Step 2: sign and submit to get p2p\n            // Step 3: then, sign and submit p2p to process payment\n            // STEP 2: sign and submit to get p2p\n            const base64Json = Buffer.from(JSON.stringify(paymentDueData)).toString(\"base64\");\n            const merchantSignature = dropp_signature_generator_1.DroppSignatureGenerator.generateMerchantSignature(Buffer.from(JSON.stringify(paymentDueData)).toString(\"hex\"), signingKey);\n            const payload = {\n                signatures: { merchant: merchantSignature },\n                dataInBase64: base64Json\n            };\n            const url = \"/api/rps/v1/payments/p2p\";\n            const response = yield this.droppClient.postToDroppService(url, payload);\n            const p2p = response.data;\n            // STEP 3: then, sign and submit p2p to process payment\n            return this.submit(p2p, signingKey);\n        });\n    }\n    submit(promiseToPay, signingKey) {\n        return __awaiter(this, void 0, void 0, function* () {\n            promiseToPay.signatures.merchant = dropp_signature_generator_1.DroppSignatureGenerator.generateMerchantSignature(promiseToPay.signatures.dropp, signingKey);\n            const url = \"/api/rps/v1/payments/p2p/process\";\n            return yield this.droppClient.postToDroppService(url, promiseToPay);\n        });\n    }\n}\nexports.DroppRecurringPaymentRequest = DroppRecurringPaymentRequest;\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-recurring-payment-request.ts?\n}");

/***/ }),

/***/ "./src/dropp-refund-request.ts":
/*!*************************************!*\
  !*** ./src/dropp-refund-request.ts ***!
  \*************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.DroppRefundRequest = void 0;\nconst dropp_signature_generator_1 = __webpack_require__(/*! ./dropp-signature-generator */ \"./src/dropp-signature-generator.ts\");\nclass DroppRefundRequest {\n    constructor(droppHttpClient) {\n        this.droppClient = droppHttpClient;\n    }\n    submit(refundData, signingKey) {\n        return __awaiter(this, void 0, void 0, function* () {\n            const refundUrl = \"/payment/refund\";\n            const base64Json = Buffer.from(JSON.stringify(refundData)).toString(\"base64\");\n            const merchantSignature = dropp_signature_generator_1.DroppSignatureGenerator.generateMerchantSignature(Buffer.from(base64Json).toString(\"hex\"), signingKey);\n            const postData = {\n                methodName: \"refundMerchantPayment\",\n                refundBase64Bytes: base64Json,\n                signature: { merchant: merchantSignature }\n            };\n            return yield this.droppClient.postToDroppService(refundUrl, postData);\n        });\n    }\n}\nexports.DroppRefundRequest = DroppRefundRequest;\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-refund-request.ts?\n}");

/***/ }),

/***/ "./src/dropp-response.ts":
/*!*******************************!*\
  !*** ./src/dropp-response.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, exports) => {

eval("{\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.DroppResponse = void 0;\n/**\n * Standard response from Dropp API calls.\n */\nclass DroppResponse {\n    constructor(responseCode, errors, data) {\n        this.responseCode = responseCode;\n        this.errors = errors;\n        this.data = data;\n    }\n}\nexports.DroppResponse = DroppResponse;\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-response.ts?\n}");

/***/ }),

/***/ "./src/dropp-sdk-version.ts":
/*!**********************************!*\
  !*** ./src/dropp-sdk-version.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, exports) => {

eval("{\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.DROPP_SDK_NAME = exports.DROPP_SDK_VERSION = void 0;\nexports.DROPP_SDK_VERSION = \"0.1.1\";\nexports.DROPP_SDK_NAME = \"dropp-sdk-js\";\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-sdk-version.ts?\n}");

/***/ }),

/***/ "./src/dropp-signature-generator.ts":
/*!******************************************!*\
  !*** ./src/dropp-signature-generator.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("{\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.DroppSignatureGenerator = void 0;\nconst buffer_1 = __webpack_require__(/*! buffer */ \"buffer\");\nconst nacl = __webpack_require__(/*! tweetnacl */ \"tweetnacl\");\nclass DroppSignatureGenerator {\n    static generateMerchantSignature(dataToSignInHex, signingKey) {\n        if (dataToSignInHex !== null && dataToSignInHex !== undefined) {\n            const bytesToSign = [buffer_1.Buffer.from(dataToSignInHex, \"hex\")];\n            const signingKeyWithoutPrefix = this.removeKeyPrefix(signingKey);\n            const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(buffer_1.Buffer.from(signingKeyWithoutPrefix, \"hex\")));\n            const merchantByteArray = nacl.sign.detached(new Uint8Array(buffer_1.Buffer.concat(bytesToSign)), keyPair.secretKey);\n            return buffer_1.Buffer.from(merchantByteArray.buffer).toString(\"hex\");\n        }\n        throw new Error(\"Missing data to sign\");\n    }\n    static generateSignatureForData(dataToSignInJSON, signingKey) {\n        if (Object.keys(dataToSignInJSON).length === 0) {\n            throw new Error(\"Cannot generate signature: dataToSignInJSON is empty.\");\n        }\n        const dataToSignInHex = buffer_1.Buffer.from(JSON.stringify(dataToSignInJSON)).toString(\"hex\");\n        return this.generateMerchantSignature(dataToSignInHex, signingKey);\n    }\n    static removeKeyPrefix(signingKey) {\n        const keyPrefix = \"302e020100300506032b657004220420\";\n        if (signingKey.startsWith(keyPrefix)) {\n            return signingKey.slice(keyPrefix.length);\n        }\n        return signingKey;\n    }\n}\nexports.DroppSignatureGenerator = DroppSignatureGenerator;\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-signature-generator.ts?\n}");

/***/ }),

/***/ "./src/dropp-transaction-request.ts":
/*!******************************************!*\
  !*** ./src/dropp-transaction-request.ts ***!
  \******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.DroppTransactionRequest = void 0;\nconst dropp_signature_generator_1 = __webpack_require__(/*! ./dropp-signature-generator */ \"./src/dropp-signature-generator.ts\");\nclass DroppTransactionRequest {\n    constructor(droppHttpClient) {\n        this.droppClient = droppHttpClient;\n    }\n    getTransactions(requestParameters, parentMerchantAccountId, signingKey) {\n        return __awaiter(this, void 0, void 0, function* () {\n            const signature = dropp_signature_generator_1.DroppSignatureGenerator.generateSignatureForData(Object.assign({}, requestParameters), signingKey);\n            return this.fetchTransactions(requestParameters, parentMerchantAccountId, signature);\n        });\n    }\n    fetchTransactions(requestParameters, parentMerchantAccountId, signature) {\n        return __awaiter(this, void 0, void 0, function* () {\n            const paymentUrl = `/api/v1/merchants/${parentMerchantAccountId}/getTransactions`;\n            const postData = {\n                methodName: \"getTxHistoryLinkedMerchants\",\n                base64JsonContent: Buffer.from(JSON.stringify(requestParameters)).toString('base64'),\n                signature: signature\n            };\n            console.log(\"Fetch Transactions with params : \", postData);\n            return yield this.droppClient.postToDroppService(paymentUrl, postData);\n        });\n    }\n}\nexports.DroppTransactionRequest = DroppTransactionRequest;\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/dropp-transaction-request.ts?\n}");

/***/ }),

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {\n    if (k2 === undefined) k2 = k;\n    var desc = Object.getOwnPropertyDescriptor(m, k);\n    if (!desc || (\"get\" in desc ? !m.__esModule : desc.writable || desc.configurable)) {\n      desc = { enumerable: true, get: function() { return m[k]; } };\n    }\n    Object.defineProperty(o, k2, desc);\n}) : (function(o, m, k, k2) {\n    if (k2 === undefined) k2 = k;\n    o[k2] = m[k];\n}));\nvar __exportStar = (this && this.__exportStar) || function(m, exports) {\n    for (var p in m) if (p !== \"default\" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\n// request types: payments, recurring payments, credit payments, refunds, etc.\n__exportStar(__webpack_require__(/*! ./dropp-payment-request */ \"./src/dropp-payment-request.ts\"), exports);\n__exportStar(__webpack_require__(/*! ./dropp-credit-payment-request */ \"./src/dropp-credit-payment-request.ts\"), exports);\n__exportStar(__webpack_require__(/*! ./dropp-recurring-payment-request */ \"./src/dropp-recurring-payment-request.ts\"), exports);\n__exportStar(__webpack_require__(/*! ./dropp-preauth-payment-request */ \"./src/dropp-preauth-payment-request.ts\"), exports);\n__exportStar(__webpack_require__(/*! ./dropp-refund-request */ \"./src/dropp-refund-request.ts\"), exports);\n// response types\n__exportStar(__webpack_require__(/*! ./dropp-response */ \"./src/dropp-response.ts\"), exports);\n__exportStar(__webpack_require__(/*! ./dropp-client */ \"./src/dropp-client.ts\"), exports);\n__exportStar(__webpack_require__(/*! ./dropp-payloads */ \"./src/dropp-payloads.ts\"), exports);\n__exportStar(__webpack_require__(/*! ./dropp-transaction-request */ \"./src/dropp-transaction-request.ts\"), exports);\n__exportStar(__webpack_require__(/*! ./dropp-network-member-request */ \"./src/dropp-network-member-request.ts\"), exports);\n__exportStar(__webpack_require__(/*! ./network-member-request-data */ \"./src/network-member-request-data.ts\"), exports);\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/index.ts?\n}");

/***/ }),

/***/ "./src/network-member-request-data.ts":
/*!********************************************!*\
  !*** ./src/network-member-request-data.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, exports) => {

eval("{\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\n\n\n//# sourceURL=webpack://dropp-sdk-js/./src/network-member-request-data.ts?\n}");

/***/ }),

/***/ "axios":
/*!************************!*\
  !*** external "axios" ***!
  \************************/
/***/ ((module) => {

module.exports = require("axios");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("os");

/***/ }),

/***/ "tweetnacl":
/*!****************************!*\
  !*** external "tweetnacl" ***!
  \****************************/
/***/ ((module) => {

module.exports = require("tweetnacl");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/index.ts");
/******/ 	var __webpack_export_target__ = this;
/******/ 	for(var __webpack_i__ in __webpack_exports__) __webpack_export_target__[__webpack_i__] = __webpack_exports__[__webpack_i__];
/******/ 	if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ 	
/******/ })()
;