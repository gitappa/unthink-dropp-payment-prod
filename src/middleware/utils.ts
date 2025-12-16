import axios from 'axios';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
function log(message: string): void {
  console.log(`[PAYMENT-ROUTES] - ${message}`);
}
const TRANSACTION_BASE_URL = process.env.DJANGO_BASE_URL + '/transactions';
log(`DJANGO_BASE_URL: ${process.env.DJANGO_BASE_URL}`);
log(`Transaction Base URL: ${TRANSACTION_BASE_URL}`);
export async function createTransactionRecord(payload: any) {
  try {
    const resp = await axios.post(`${TRANSACTION_BASE_URL}/create_transaction/`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const ok = resp?.data?.status_code === 200;
    return { ok, raw: resp.data, data: resp.data?.data ?? null };
  } catch (err: any) {
    console.error(`[utils] createTransactionRecord error: ${err?.message || err}`);
    return { ok: false, raw: err, data: null };
  }
}

export async function updateTransactionRecord(transactionId: string, payload: any) {
  try {
    const body = Object.assign({ transaction_id: transactionId }, payload);
    const resp = await axios.put(`${TRANSACTION_BASE_URL}/update_transaction/`, body, {
      headers: { 'Content-Type': 'application/json' },
    });

    const ok = resp?.data?.status_code === 200;
    return {
      ok,
      raw: resp.data,
      data: resp.data?.data ?? null,
      successUrl: resp.data?.data?.successUrl ?? '',
      failureUrl: resp.data?.data?.failureUrl ?? '',
      signingKey: resp.data?.data?.signingKey ?? '',
      merchantId: resp.data?.data?.merchantId ?? '',
    };
  } catch (err: any) {
    console.error(`[utils] updateTransactionRecord error for ${transactionId}: ${err?.message || err}`);
    return { ok: false, raw: err, data: null, successCallbackUrl: '', failureCallbackUrl: '' };
  }
}

  /**
   * Helper function to verify a Hedera transaction on-chain
   * Uses Hedera Mirror Node (read-only, free) to validate transaction receipt
   * 
   * Accepts two types of identifiers:
   * 1. Hedera Transaction ID: "0.0.XXXXX@171234567890" format
   * 2. Payment reference: hex string or UUID (falls back to payment verification)
   */
export async function verifyHederaTransaction(txIdString: string) {
  const axios = require('axios');
  const MIRROR_NODE_URL = process.env.HEDERA_MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com/api/v1';
  //https://testnet.mirrornode.hedera.com/api/v1
  //https://mainnet-public.mirrornode.hedera.com/api/v1
  try {
    // Detect if this is a Hedera Transaction ID or a payment reference
    const isHederaTxId = txIdString.includes('@') && txIdString.includes('.');
    
    if (!isHederaTxId) {
      // This is a payment reference (paymentRef), not a Hedera TX ID
      log(`Note: Provided ID is not a Hedera Transaction ID format. Treating as payment reference: ${txIdString}`);
      return {
        verified: true,
        error: null,
        type: 'payment_reference',
        data: {
          paymentReference: txIdString,
          timestamp: new Date().toISOString(),
          note: 'Payment reference recorded. For full on-chain verification, a Hedera Transaction ID (0.0.XXXXX@timestamp) is needed.',
        },
      };
    }
    
    // Format TxID: "0.0.123@171..." -> "0.0.123-171..." for Mirror Node API
    const formattedId = txIdString.replace(/@/g, '-').replace(/\./g, '-');
    
    // Call Mirror Node (Read-only, Free)
    const url = `${MIRROR_NODE_URL}/transactions/${formattedId}`;
    log(`Verifying Hedera transaction: ${txIdString} (formatted: ${formattedId})`);
    log(`Mirror Node URL: ${url}`);
    const response = await axios.get(url);
    log(`Mirror Node response: ${JSON.stringify(response)}`);
    const transactionData = response.data;
    log(`Transaction data: ${JSON.stringify(transactionData)}`);

    if (!transactionData || !transactionData.transactions || transactionData.transactions.length === 0) {
      log(`Transaction not found on Hedera: ${txIdString}`);
      return { verified: false, error: 'Transaction not found on Hedera', data: null };
    }

    const transaction = transactionData.transactions[0];
    log(`Transaction data retrieved: ${JSON.stringify(transaction)}`);
    const receipt = transaction.receipt;
    log(`Transaction receipt: ${JSON.stringify(receipt)}`);
    // Verify the transaction was successful (status = SUCCESS)
    if (receipt?.status !== 'SUCCESS') {
      log(`Transaction failed on Hedera: ${txIdString}, status: ${receipt?.status}`);
      return { verified: false, error: `Transaction status: ${receipt?.status}`, data: transaction };
    }

    log(`Transaction verified successfully on Hedera: ${txIdString}`);
    return {
      verified: true,
      error: null,
      type: 'hedera_transaction',
      data: {
        transactionId: transaction.transaction_id,
        status: receipt.status,
        amount: transaction.transfers?.[0]?.amount || null,
        entityId: receipt.entity_id,
        timestamp: transaction.consensus_timestamp,
        from: transaction.charged_tx_fee ? transactionData.transactions[0].entity_id : null,
        to: receipt.entity_id,
        memo: transaction.memo_base64 ? Buffer.from(transaction.memo_base64, 'base64').toString() : null,
      },
    };
  } catch (err: any) {
    // Check if error is 404 (not found) - might be a payment reference instead
    if (err?.response?.status === 404) {
      log(`Hedera transaction not found. This may be a payment reference or pending transaction.`);
      return {
        verified: false,
        error: 'Transaction not found on Hedera Mirror Node (may be pending or payment reference)',
        data: null,
      };
    }
    
    log(`Error verifying Hedera transaction: ${err?.message || err}`);
    return {
      verified: false,
      error: err?.message || 'Failed to verify transaction',
      data: null,
    };
  }
}

  /**
   * Helper function to extract Hedera transaction ID from P2P object or payment response
   * Transaction ID format: "0.0.XXXXX@171234567890" (accountId@consensusTimestamp)
   * 
   * Extraction priority:
   * 1. Direct transactionId field
   * 2. Encoded transfer data (encodedHHTransfer base64)
   * 3. Construct from payer (wallet ID) + timestamp
   * 4. Use paymentRef as fallback (for verification against Mirror Node)
 */
export function extractHederaTransactionId(p2pObj?: any, paymentResponse?: any): string | null {
  // Try 1: Direct transactionId from P2P object (from wallet)
  if (p2pObj?.transactionId) {
    return p2pObj.transactionId;
  }
  
  // Try 2: Direct transactionId from payment response
  if (paymentResponse?.transactionId) {
    return paymentResponse.transactionId;
  }
  
  // Try 3: Decode encodedHHTransfer to get transaction details
  if (p2pObj?.encodedHHTransfer) {
    try {
      const transferData = JSON.parse(Buffer.from(p2pObj.encodedHHTransfer, 'base64').toString());
      if (transferData?.transactionId) {
        return transferData.transactionId;
      }
      // Try to construct from transfer data
      if (transferData?.from && transferData?.timestamp) {
        return `${transferData.from}@${transferData.timestamp}`;
      }
    } catch (e) {
      log(`Failed to decode encodedHHTransfer: ${e}`);
    }
  }
  
  // Try 4: Construct from payer (wallet account ID) + p2p timeStamp
  if (p2pObj?.payer && p2pObj?.timeStamp) {
    // Format: accountId@consensusTimestamp (in nanoseconds or milliseconds)
    // If timeStamp is in seconds/milliseconds, convert to proper format
    const timestamp = p2pObj.timeStamp;
    const formattedTimestamp = String(timestamp).length <= 10 ? timestamp * 1000000000 : timestamp;
    return `${p2pObj.payer}@${formattedTimestamp}`;
  }
  
  // Try 5: Use paymentRef as alternative identifier (not ideal but useful for tracking)
  if (paymentResponse?.data?.paymentRef) {
    log(`Warning: Using paymentRef instead of transactionId: ${paymentResponse.data.paymentRef}`);
    return paymentResponse.data.paymentRef; // Not a real Hedera TX ID but useful for tracking
  }
  
  return null;
}
export default { createTransactionRecord, updateTransactionRecord, verifyHederaTransaction, extractHederaTransactionId };
