// Import the 'crypto' module
const crypto = require('crypto');
const fs = require('fs');
const Web3 = require('web3');


// sendSMS()

const web3 = new Web3();

// const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
//   modulusLength: 2048,
//   publicKeyEncoding: {
//     type: 'spki',
//     format: 'pem'
//   },
//   privateKeyEncoding: {
//     type: 'pkcs8',
//     format: 'pem'
//   }
// });

// fs.writeFileSync('publickey.pem', publicKey);
// fs.writeFileSync('privatekey.pem', privateKey);

// 0x17fa14b0d73aa6a26d6b8720c1c84b50984f5c188ee1c113d2361e430f1b6764
console.log("keccak256 hash ", web3.utils.soliditySha3(1234))


const privateKey = fs.readFileSync('privatekey.pem', 'utf-8');
const publicKey = fs.readFileSync('publickey.pem', 'utf-8');


// Data to be encrypted
const plaintext = '9129114550';

// Encrypt the plaintext with the public key
const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(plaintext, 'utf-8'));

const hexEncrypted = encrypted.toString('hex');
// const hexEncrypted = "bb95d294304e7d3451e008518cef0b45b9ec7d46abe9f810b2e34438485f551430ce78f76c2f5c2952d713c8fd8269e543dca59c4f7685dc571acf4f694512e7e48359cf58c3fbdc5538bcd24e837d9bef42a1ab9ea85ff2911de4d71b725a2be693fdfc11faf3d2056faf3887109cbf29d96ddceb57d28ba88354c240e379814492a9a6a8271c0ebdba6e78a7ed5d49d114abc4b4abc4ace68e54a1b6da9cbe4894463300fc5f2feb1d406c077aa58de98db553e3d7211f2a3983aa7d521226674a7bca8a026f7fdc8ab82db96aa8d381f6ea865b42db79580ea996f60352b98cbcf013b521f2ff67970267c1d842a30880e2b78fbe05d61c7d2ba5ff5f1708";

// Decrypt the ciphertext with the private key
const decrypted = crypto.privateDecrypt(privateKey, Buffer.from(hexEncrypted, 'hex'));

console.log(`Original message: ${plaintext}`);
console.log(`Encrypted message: ${encrypted.toString('base64')}`);
console.log(`Hex Encrypted message: ${hexEncrypted}`);
console.log(`Decrypted message: ${decrypted.toString('utf-8')}`);
