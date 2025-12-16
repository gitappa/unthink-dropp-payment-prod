import express, { Express, Request, Response, Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
//import * as droppSdk from './dropp-sdk-js';
import * as droppPayment from './dropp-payment';
import * as droppSdk from 'dropp-sdk-js';

import * as droppTransaction from './dropp-transaction';
import paymentRoutes from './src/routes/payment-routes';
//import { IInvoice } from './dropp-sdk-js/dropp-payloads';
import { IInvoice } from 'dropp-sdk-js/dropp-payloads';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 8080;
const myDroppMerchantAccountId: string = process.env.DROPP_MERCHANT_ID!;

// Middleware
app.use(express.json());
//app.use(express.static('pages'));
app.use(express.static('dropp-sdk-js'));

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: "*",
  methods: ["*"],
  allowedHeaders: ["*"]
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.DROPP_ENVIRONMENT || 'development'
  });
});

// Register payment routes (REST API endpoints for dynamic payments)
app.use('/api/payments', paymentRoutes as Router);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Logger helper
function log(message: string) {
  console.log(`    - ${message}`);
}

// Response helpers
function returnCallback(returnValue: any, res: Response) {
  res.status(200).json({
    ...returnValue
  });
}

function returnCallbackForTransactions(returnValue: any, res: Response) {
  res.status(200).json({
    ...returnValue
  });
}

// Legacy callback handlers (for backward compatibility with the original index.ts flow)

function getAuthorizeUrl(res: Response) {
  const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT);
  try {
    const url = droppClient.getUrlForSubMerchantAuthorization(process.env.DROPP_MERCHANT_ID);
    res.status(200).json({ success: true, authorizeUrl: url });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get authorize URL' });
  }
}

function getTransactions(res: Response) {
  const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
  const requestParameters = {
    userId: process.env.DROPP_MERCHANT_ID,
    offset: 0,
    limit: 10
  }
  droppTransaction.getTransactions(requestParameters, res as any, returnCallbackForTransactions as any)
}

function processRedemption(data: any, res: Response) {
  const redemptionData = {
    merchantAccountId: myDroppMerchantAccountId,
    userAccountId: data.userAccountId,
    amount: data.amount,
    currency: 'USD',
    creditReference: 'Test redeem',
    ipAddress: '127.0.0.1'
  };
  log(`Credit payment. Initiating: ${redemptionData.currency} ${redemptionData.amount},  ${redemptionData.merchantAccountId} --> ${redemptionData.userAccountId}.`);
  droppPayment.processCreditPayment(redemptionData, res as any, returnCallback as any);
}

function processRefund(data: any, res: Response) {
  const refundData = {
    merchantAccount: myDroppMerchantAccountId,
    amount: data.amount,
    refundRef: 'Any reference you want to use (optional)',
    refundReason: 'Test refund (optional)',
    paymentReference: data.paymentRef,
    timeStamp: Date.now(),
    ipAddress: '127.0.0.1'
  };
  log(`Refund. Initiating: ${JSON.stringify(refundData)}.`);
  droppPayment.processRefund(refundData, res as any, returnCallback as any);
}

function processDroppPayment(p2p: string | undefined, res: Response) {
  if (!p2p) {
    res.status(400).json({ error: 'Required p2p param is missing.' });
    return;
  }

  const p2pObj = JSON.parse(p2p);
  const invoiceData: IInvoice = JSON.parse(Buffer.from(p2pObj.invoiceBytes, 'base64').toString());
  log(`invoiceData: ${JSON.stringify(invoiceData)}`);
  log(`Single payment. Initiating: ${invoiceData.currency} ${invoiceData.amount}, ${invoiceData.walletAddress} --> ${invoiceData.merchantAccount}`);
  droppPayment.processPayment(p2pObj, res as any, returnCallback as any);
}

function processDroppPostPayment(p2pObj: droppSdk.IPromiseToPay, res: Response) {
  if (!p2pObj) {
    res.status(400).json({ error: 'Required p2p param is missing.' });
    return;
  }

  const invoiceData: IInvoice = JSON.parse(Buffer.from(p2pObj.invoiceBytes, 'base64').toString());
  log(`invoiceData: ${JSON.stringify(invoiceData)}`);
  log(`Single payment with POST callback. Initiating: ${invoiceData.currency} ${invoiceData.amount}, ${invoiceData.walletAddress} --> ${invoiceData.merchantAccount}`);
  droppPayment.processPayment(p2pObj, res as any, returnCallback as any);
}

function processDroppPaymentForSubMerchant(p2p: string | undefined, res: Response) {
  if (!p2p) {
    res.status(400).json({ error: 'Required p2p param is missing.' });
    return;
  }

  const p2pObj = JSON.parse(p2p);
  const invoiceData: IInvoice = JSON.parse(Buffer.from(p2pObj.invoiceBytes, 'base64').toString());
  log(`invoiceData: ${JSON.stringify(invoiceData)}`);
  log(`Single payment for sub-merchant. Initiating: ${invoiceData.currency} ${invoiceData.amount}, ${invoiceData.walletAddress} --> ${invoiceData.merchantAccount}`);
  droppPayment.processPaymentForSubMerchant(p2pObj, res as any, returnCallback as any);
}

function processRecurringPayment(data: string | undefined, res: Response) {
  if (!data) {
    res.status(400).json({ error: 'Required param is missing.' });
    return;
  }

  const recurringData = JSON.parse(data);
  log('Recurring payment. Initiating.');
  droppPayment.processRecurringPayment(recurringData, res as any, returnCallback as any);
}

function processRecurringPaymentDue(data: any, res: Response) {
  if (!data) {
    res.status(400).json({ error: 'Required param is missing.' });
    return;
  }

  log('Recurring payment due processing. Initiating.');
  droppPayment.processRecurringPaymentDue(data, res as any, returnCallback as any);
}

function processUUIDGeneration(paymentDetails: string | undefined, res: Response) {
  if (!paymentDetails) {
    res.status(400).json({ error: 'Required payment details are missing.' });
    return;
  }

  const paymentDetailsObj = JSON.parse(paymentDetails);
  paymentDetailsObj.merchantAccount = myDroppMerchantAccountId;
  paymentDetailsObj.currency = 'USD';

  log('UUID Generation. Initiating.');
  droppPayment.generateUUID(paymentDetailsObj, res, (response: any) => {
    console.log('UUID Generation Response:', response.responseCode);
    returnCallback(response, res);
  });
}

function processUUIDStatusCheck(uuid: string | undefined, res: Response) {
  if (!uuid) {
    res.status(400).json({ error: 'Required UUID param is missing.' });
    return;
  }

  log(`UUID Status Check. Initiating for: ${uuid}`);
  droppPayment.checkUUIDStatus(uuid, (statusResponse: any) => {
    const result = {
      status: statusResponse.responseCode === 0 ? 'success' : 'failure',
      uuidStatus: statusResponse.data?.status,
      response: statusResponse
    };
    console.log(JSON.stringify(result));
    res.status(200).json(result);
  });
}

// Legacy routes (for backward compatibility with single-payment.html flow)
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

app.get('/index.html', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

app.get('/pages/:page', (req: Request, res: Response) => {
  const page = req.params.page;
  const filePath = path.join(__dirname, 'pages', page);
  res.sendFile(filePath);
});

app.get('/generate-uuid', (req: Request, res: Response) => {
  processUUIDGeneration(req.query.paymentDetails as string, res);
});

app.get('/get-authorize-url', (req: Request, res: Response) => {
  getAuthorizeUrl(res);
});

app.get('/rps-callback', (req: Request, res: Response) => {
  processRecurringPayment(req.query.RecurringData as string, res);
});

app.get('/callback', (req: Request, res: Response) => {
  processDroppPayment(req.query.p2p as string, res);
});

app.post('/post-callback', (req: Request, res: Response) => {
  processDroppPostPayment(req.body, res);
});

app.get('/callbackForSubMerchant', (req: Request, res: Response) => {
  processDroppPaymentForSubMerchant(req.query.p2p as string, res);
});

app.get('/redeem-callback', (req: Request, res: Response) => {
  processRedemption({ userAccountId: req.query.userAccountId, amount: req.query.amount }, res);
});

app.get('/refund-callback', (req: Request, res: Response) => {
  processRefund({ paymentRef: req.query.paymentRef, amount: req.query.amount }, res);
});

app.get('/rps-callback-due', (req: Request, res: Response) => {
  processRecurringPaymentDue({ recurringToken: req.query.recurringToken, amount: req.query.amount }, res);
});

app.get('/check-uuid-status', (req: Request, res: Response) => {
  processUUIDStatusCheck(req.query.uuid as string, res);
});

app.get('/get-transactions', (req: Request, res: Response) => {
  getTransactions(res);
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Resource not found. Try /api/payments/checkout for dynamic payments or /index.html for the sample page.' });
});



// Start server
/*
const host = 'localhost';
const port = parseInt(process.env.PORT || '8080', 10);
app.listen(port, host, () => {
  console.log('\n:: Dropp Payment Samples with Express & REST API ::');
  //log(`Running    : http://${host}:${port}`);
  log('Environment: ' + process.env.DROPP_ENVIRONMENT);
  log('Merchant ID: ' + process.env.DROPP_MERCHANT_ID);
  log('NOTE: Ensure you have correct signing key and merchant ID added. Key and ID differ per environment.');
  log('');
  log('Environment: ' + process.env.DJANGO_BASE_URL);
  log(' Environment: ' + process.env.HEDERA_MIRROR_NODE_URL);
  

  // Just verifying SDK is accessible
  //const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT);
  //new droppSdk.DroppPaymentRequest(droppClient);
});
*/
// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.DROPP_ENVIRONMENT || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  log('Merchant ID: ' + process.env.DROPP_MERCHANT_ID);
  log('Environment: ' + process.env.DJANGO_BASE_URL);
  log(' Environment: ' + process.env.HEDERA_MIRROR_NODE_URL);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});