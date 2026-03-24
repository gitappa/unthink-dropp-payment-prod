import http, { get, IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import * as droppSdk from './dropp-sdk-js';
import * as droppPayment from './dropp-payment';
import * as droppTransaction from './dropp-transaction';
import { getNetworkMembersApi } from './network-members';
import { IInvoice } from './dropp-sdk-js/dropp-payloads';

dotenv.config();

const myDroppMerchantAccountId: string = process.env.DROPP_MERCHANT_ID!;
type Res = ServerResponse<IncomingMessage>;

function serveHtmlFileContents(filename: string, res: ServerResponse): void {
    return serveFileContents(filename, "text/html", res);
}
function serveJsFileContents(filename: string, res: ServerResponse): void {
    return serveFileContents(filename, "application/javascript", res);
}

function serveFileContents(filename: string, contentType: string, res: ServerResponse): void {
    getFileContents(filename, function (contents: Buffer) {
        res.setHeader("Content-Type", contentType);
        res.writeHead(200);
        res.end(contents);
    });
}

function getFileContents(filename: string, callback: (contents: Buffer) => void): void {
    const fullPath = __dirname + filename;
    fs.readFile(fullPath)
        .then(contents => {
            callback(contents);
        })
        .catch(err => {
            console.error(`Could not read ${fullPath} file: ${err}`);
            process.exit(1);
        });
}

function returnCallback(returnValue: any, res: Res) {
  res.writeHead(200);
  res.end(
    JSON.stringify({
      // status: returnValue.responseCode === 0 ? 'success' : 'failure',
      // responseCode: returnValue.responseCode,
      // paymentResponse: returnValue
      ...returnValue
    })
  );
}


function returnCallbackForTransactions(returnValue: any, res: Res) {
  res.writeHead(200);
  res.end(
    JSON.stringify({
      ...returnValue
    })
  );
}

function returnCallbackForNetworkMembers(returnValue: any, res: Res) {
  res.writeHead(200);
  res.end(JSON.stringify(returnValue));
}

function getNetworkMembers(query: any, res: Res) {
  const request = {
    from: query.from,
    to: query.to,
    offset: query.offset ? parseInt(query.offset) : 0,
    limit: query.limit ? parseInt(query.limit) : undefined
  };
  getNetworkMembersApi(request, res, returnCallbackForNetworkMembers);
}

function getAuthorizeUrl(res: Res) {
  const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT);
  try {
    const url = droppClient.getUrlForSubMerchantAuthorization(process.env.DROPP_MERCHANT_ID);
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, authorizeUrl: url }));
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: 'Failed to get authorize URL' }));
  }
}

function getTransactions(res: Res) {
  const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
  const requestParameters = {
    userId: process.env.DROPP_MERCHANT_ID,
    offset: 0,
    limit: 10
  }
  droppTransaction.getTransactions(requestParameters, res, returnCallbackForTransactions)
}

function processRedemption(data: any, res: Res) {
  const redemptionData = {
    merchantAccountId: myDroppMerchantAccountId,
    userAccountId: data.userAccountId,
    amount: data.amount,
    currency: 'USD',
    creditReference: 'Test redeem',
    ipAddress: '127.0.0.1'
  };
  log(`Credit payment. Initiating: ${redemptionData.currency} ${redemptionData.amount},  ${redemptionData.merchantAccountId} --> ${redemptionData.userAccountId}.`);
  droppPayment.processCreditPayment(redemptionData, res, returnCallback);
}

function processRefund(data: any, res: Res) {
  const refundData = {
    merchantAccount: myDroppMerchantAccountId,
    amount: data.amount,
    refundRef: 'Any reference you want to use (optional)',
    refundReason: 'Test refund (optional)',
    paymentReference: data.paymentRef,
    transactionReference: data.transactionReference,
    timeStamp: Date.now(),
    ipAddress: '127.0.0.1'
  };
  log(`Refund. Initiating: ${JSON.stringify(refundData)}.`);
  droppPayment.processRefund(refundData, res, returnCallback);
}

function processDroppPayment(p2p: string | undefined, res: Res) {
  if (!p2p) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Required p2p param is missing.' }));
    return;
  }

  const p2pObj = JSON.parse(p2p);
  const invoiceData: IInvoice = JSON.parse(Buffer.from(p2pObj.invoiceBytes, 'base64').toString());
  log(`invoiceData: ${JSON.stringify(invoiceData)}`);
  log(`Single payment. Initiating: ${invoiceData.currency} ${invoiceData.amount}, ${invoiceData.walletAddress} --> ${invoiceData.merchantAccount}`);
  droppPayment.processPayment(p2pObj, res, returnCallback);
}


function processDroppPostPayment(p2pObj: droppSdk.IPromiseToPay, res: Res) {
  if (!p2pObj) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Required p2p param is missing.' }));
    return;
  }

  const invoiceData: IInvoice = JSON.parse(Buffer.from(p2pObj.invoiceBytes, 'base64').toString());
  log(`invoiceData: ${JSON.stringify(invoiceData)}`);
  log(`Single payment with POST callback. Initiating: ${invoiceData.currency} ${invoiceData.amount}, ${invoiceData.walletAddress} --> ${invoiceData.merchantAccount}`);
  droppPayment.processPayment(p2pObj, res, returnCallback);
}

function processDroppPaymentForSubMerchant(p2p: string | undefined, res: Res) {
  if (!p2p) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Required p2p param is missing.' }));
    return;
  }

  const p2pObj = JSON.parse(p2p);
  const invoiceData: IInvoice = JSON.parse(Buffer.from(p2pObj.invoiceBytes, 'base64').toString());
  log(`invoiceData: ${JSON.stringify(invoiceData)}`);
  log(`Single payment for sub-merchant. Initiating: ${invoiceData.currency} ${invoiceData.amount}, ${invoiceData.walletAddress} --> ${invoiceData.merchantAccount}`);
 console.log(droppPayment.processPaymentForSubMerchant);
  droppPayment.processPaymentForSubMerchant(p2pObj, res, returnCallback);
}

function processRecurringPayment(data: string | undefined, res: Res) {
  if (!data) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Required param is missing.' }));
    return;
  }

  const recurringData = JSON.parse(data);
  log('Recurring payment. Initiating.');
  droppPayment.processRecurringPayment(recurringData, res, returnCallback);
}

function processRecurringPaymentDue(data: any, res: Res) {
  if (!data) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Required param is missing.' }));
    return;
  }

  log('Recurring payment due processing. Initiating.');
  droppPayment.processRecurringPaymentDue(data, res, returnCallback);
}

function processPreAuthPayment(data: string | undefined, res: Res) {
  if (!data) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Required param is missing.' }));
    return;
  }

  const recurringData = JSON.parse(data);
  log('Pre Auth payment. Initiating.');
  log(`recurringData. ${recurringData}`);
  droppPayment.processPreAuthPayment(recurringData, res, returnCallback);
}
function processSubMerchantPreAuthPayment(data: string | undefined, res: Res) {
  if (!data) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Required param is missing.' }));
    return;
  }

  const recurringData = JSON.parse(data);
  log('Pre Auth payment. Initiating for sub merchant.');
  log(`recurringData. ${recurringData}`);
  droppPayment.processSubMerchantPreAuthPayment(recurringData, res, returnCallback);
}

function processPreAuthPaymentDue(data: any, res: Res) {
  if (!data) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Required param is missing.' }));
    return;
  }

  log('Pre Auth payment due processing. Initiating.');
  droppPayment.processPreAuthPaymentDue(data, res, returnCallback);
}


function processUUIDGeneration(paymentDetails: string | undefined, res: Res) {
  if (!paymentDetails) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Required payment details are missing.' }));
    return;
  }

  let paymentDetailsObj = JSON.parse(paymentDetails);
  paymentDetailsObj.merchantAccount = paymentDetailsObj.subMerchantId ? paymentDetailsObj.subMerchantId : myDroppMerchantAccountId;
  if (paymentDetailsObj.subMerchantId) {
    paymentDetailsObj.distribution = JSON.stringify({ [myDroppMerchantAccountId]: paymentDetailsObj.sharePercent });
  }

  paymentDetailsObj.currency = 'USD';
  log(`UUID Generation. Initiating. ${JSON.stringify(paymentDetailsObj)}`);
  droppPayment.generateUUID(paymentDetailsObj, res, (response: any) => {
    console.log('UUID Generation Response:', response.responseCode);
    returnCallback(response, res);
  });
}

function processUUIDStatusCheck(uuid: string | undefined, res: Res) {
  if (!uuid) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Required UUID param is missing.' }));
    return;
  }

  log(`UUID Status Check. Initiating for: ${uuid}`);
  droppPayment.checkUUIDStatus(uuid, (statusResponse: any) => {
    console.log('UUID Status Check Response:', statusResponse);
    const result = {
      status: statusResponse.responseCode === 0 ? 'success' : 'failure',
      uuidStatus: statusResponse.data?.status,
      response: statusResponse
      // response: statusResponse.status === 200 ? 'Payment Successful!' : statusResponse.status === 202 ? 'Pending.' : 'Network Error or Failed.'
    };
    console.log(JSON.stringify(result));
    res.writeHead(200);
    res.end(JSON.stringify(result));
  });
}

function unknown(res: Res) {
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Resource not found. Perhaps try /callback.' }));
}

function log(message: string) {
  console.log(`    - ${message}`);
}

const requestListener = (req: IncomingMessage, res: Res) => {
  const urlObject = parseUrl(req.url ?? '', true);
  const query = urlObject.query;
  let pathname = urlObject.pathname ?? '';

  if (req.method === 'POST') {
    let body = '';

    // Collect POST body data
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const parsedBody = JSON.parse(body);
        // Handle your POST logic here
        switch (pathname) {
          case '/post-callback':
            processDroppPostPayment(parsedBody, res);
            break;
          case '/pre-auth-post-callback':
            console.log('parsedBody', JSON.stringify(parsedBody));
            console.log("calling preAuth post");
            processPreAuthPayment(body, res);
            break;
          default:
            unknown(res);
            break;
        }
      } catch (error) {
        res.statusCode = 400;
        res.end('Invalid JSON');
      }
    });

    return; // exit early since handled
  }

  switch (pathname) {
    case '/generate-uuid':
      processUUIDGeneration(query.paymentDetails as string, res);
      break;
    case '/get-authorize-url':
      getAuthorizeUrl(res);
      break;
    case '/rps-callback':
      processRecurringPayment(query.RecurringData as string, res);
      break;
    case '/callback':
      processDroppPayment(query.p2p as string, res);
      break;
    case '/callbackForSubMerchant':
      processDroppPaymentForSubMerchant(query.p2p as string, res);
      break;
    case '/redeem-callback':
      processRedemption({ userAccountId: query.userAccountId, amount: query.amount }, res);
      break;
    case '/refund-callback':
      processRefund({ paymentRef: query.paymentRef, amount: query.amount, transactionReference: query.transactionReference }, res);
      break;
    case '/rps-callback-due':
      processRecurringPaymentDue({ recurringToken: query.recurringToken, amount: query.amount }, res);
      break;
    case '/pre-auth-callback':
      console.log('query', JSON.stringify(query));
      processPreAuthPayment(query.RecurringData as string, res);
      break;
    case '/pre-auth-submerchant-callback':
      console.log('query', JSON.stringify(query));
      processSubMerchantPreAuthPayment(query.RecurringData as string, res);
      break;
    case '/pre-auth-callback-due':
      processPreAuthPaymentDue({ recurringToken: query.recurringToken, amount: query.amount, action: query.action }, res);
      break;
    case '/check-uuid-status':
      processUUIDStatusCheck(query.uuid as string, res);
      break;
    case '/get-transactions':
      getTransactions(res);
      break;
    case '/get-network-members':
      getNetworkMembers(query, res);
      break;
    case '/':
    case '/index.html':
      pathname = "/pages/index.html";
      if (pathname.endsWith('.html')) {
        serveHtmlFileContents(pathname, res);
      } else if (pathname.endsWith('.js')) {
        serveJsFileContents(pathname, res);
      } else {
            unknown(res);
      }
      break;
    default:
      if (pathname.endsWith('.html')) {
        serveHtmlFileContents(pathname, res);
      } else if (pathname.endsWith('.js')) {
        serveJsFileContents(pathname, res);
      }  else {
        unknown(res);
      }
      break;
  }
};

const host = 'localhost';
const port = 8000;
const server = http.createServer(requestListener);

server.listen(port, host, () => {
  console.log('\n:: Dropp Payment Samples ::');
  log(`Running    : http://${host}:${port}`);
  log('Environment: ' + process.env.DROPP_ENVIRONMENT);
  log('Merchant ID: ' + process.env.DROPP_MERCHANT_ID);
  log('NOTE: Ensure you have correct signing key and merchant ID added. Key and ID differ per environment.');

  // Just verifying SDK is accessible
  const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT);
  new droppSdk.DroppPaymentRequest(droppClient);
});
