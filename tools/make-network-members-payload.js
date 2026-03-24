// tools/make-network-members-payload.js
// node script to generate base64+signature payload for network-members API
require('dotenv').config();  
// use CommonJS require to avoid ESM issues in plain node
// the bundled SDK does not export the signature helper, so recreate it here
const { Buffer } = require('buffer');
const nacl = require('tweetnacl');

class DroppSignatureGenerator {
  static generateMerchantSignature(dataToSignInHex, signingKey) {
    if (dataToSignInHex !== null && dataToSignInHex !== undefined) {
      const bytesToSign = [Buffer.from(dataToSignInHex, 'hex')];
      const signingKeyWithoutPrefix = this.removeKeyPrefix(signingKey);
      const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(Buffer.from(signingKeyWithoutPrefix, 'hex')));
      const merchantByteArray = nacl.sign.detached(new Uint8Array(Buffer.concat(bytesToSign)), keyPair.secretKey);
      return Buffer.from(merchantByteArray.buffer).toString('hex');
    }
    throw new Error('Missing data to sign');
  }
  static generateSignatureForData(dataToSignInJSON, signingKey) {
    if (Object.keys(dataToSignInJSON).length === 0) {
      throw new Error('Cannot generate signature: dataToSignInJSON is empty.');
    }
    const dataToSignInHex = Buffer.from(JSON.stringify(dataToSignInJSON)).toString('hex');
    return this.generateMerchantSignature(dataToSignInHex, signingKey);
  }
  static removeKeyPrefix(signingKey) {
    const keyPrefix = '302e020100300506032b657004220420';
    if (signingKey.startsWith(keyPrefix)) {
      return signingKey.slice(keyPrefix.length);
    }
    return signingKey;
  }
}

const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY; // hex string
console.log(`Using signing key: ${signingKey}`);
if (!signingKey) {
  console.error('Please set DROPP_MERCHANT_SIGNING_KEY in the environment');
  process.exit(1);
}

const request = {
  from:  "2025-06-01T00:00:00.000Z",
  to:    "2026-02-11T18:30:00.000Z",
  offset: 0,
  limit: 10,
  timestamp: "2026-02-11T18:30:00.000Z"
};

// static method invocation (no "new"); use the class we just imported
const signature = DroppSignatureGenerator.generateSignatureForData(request, signingKey);
const base64JsonContent = Buffer.from(JSON.stringify(request)).toString('base64');

console.log(JSON.stringify({ base64JsonContent, signature }, null, 2));