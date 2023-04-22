const crypto = require('crypto');
const fs = require('fs');
const Web3 = require('web3');
const { ethers } = require("ethers");

require('dotenv').config()

const contractAddress = "0x2F8b88144ea484de7bCf0879C70Bfc66bAb93586";

const contractABI = [{"inputs":[{"internalType":"address","name":"v","type":"address"},{"internalType":"bytes","name":"pubKey","type":"bytes"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"","type":"address"},{"indexed":false,"internalType":"bytes","name":"","type":"bytes"}],"name":"Requested","type":"event"},{"inputs":[{"internalType":"uint8","name":"series","type":"uint8"},{"internalType":"address","name":"c","type":"address"}],"name":"changeProofContracts","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_v","type":"address"},{"internalType":"bytes","name":"_pubKey","type":"bytes"}],"name":"changeVerifier","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_o","type":"bytes32"}],"name":"oTp","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"otpHash","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint8","name":"","type":"uint8"}],"name":"proofContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint8","name":"seriesNumber","type":"uint8"},{"components":[{"components":[{"internalType":"uint256","name":"X","type":"uint256"},{"internalType":"uint256","name":"Y","type":"uint256"}],"internalType":"struct Pairing.G1Point","name":"a","type":"tuple"},{"components":[{"internalType":"uint256[2]","name":"X","type":"uint256[2]"},{"internalType":"uint256[2]","name":"Y","type":"uint256[2]"}],"internalType":"struct Pairing.G2Point","name":"b","type":"tuple"},{"components":[{"internalType":"uint256","name":"X","type":"uint256"},{"internalType":"uint256","name":"Y","type":"uint256"}],"internalType":"struct Pairing.G1Point","name":"c","type":"tuple"}],"internalType":"struct Proof","name":"proof","type":"tuple"},{"internalType":"uint256[1]","name":"_areaCode","type":"uint256[1]"},{"internalType":"address","name":"_to","type":"address"},{"internalType":"bytes","name":"hash","type":"bytes"}],"name":"register","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"requests","outputs":[{"internalType":"uint256","name":"areaCode","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"bytes","name":"numberHash","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"verified","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"verifier","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"verifierPubkey","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_otp","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],"name":"verify","outputs":[],"stateMutability":"nonpayable","type":"function"}];

const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.INFURA_WSS));
const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_HTTPS_URL);

async function start(){
    let options = {
        fromBlock: 0,
        address: ['0x2F8b88144ea484de7bCf0879C70Bfc66bAb93586'],    //Only get events from specific addresses
    };

    let subscription = web3.eth.subscribe('logs', options,(err,event) => {
        if (!err)
        console.log(err)
    })
    
    subscription.on('data', async(event) => {
        try {
            const data =  web3.eth.abi.decodeParameters(['address', 'bytes'], event.data);
            const hexEncrypted = data[1].slice(2);
            const privateKey = fs.readFileSync('privatekey.pem', 'utf-8');
            const encrypted = Buffer.from(hexEncrypted, "hex");
            const decrypted = crypto.privateDecrypt(privateKey, encrypted);
            const phone = decrypted.toString('utf-8');
            let otp = Math.floor(Math.random() * 900000) + 100000;
            const otpHash = web3.utils.soliditySha3(otp);
            console.log(phone, otp)

            try {
                const signer = new ethers.Wallet(process.env.VERIFIER_PRIVATE_KEY,provider)
                const contract = new ethers.Contract(contractAddress, contractABI, signer);
                await contract.connect(signer).oTp(otpHash);
                await sendSMS(`+91${phone}`, otp);
            } catch (error) {
                console.log( "error sending verifier otp txn" , error)  
                throw error 
            }

        } catch (error) {
            console.log("invalid phone no", JSON.stringify(error))
        }
    })
    subscription.on('changed', changed => console.log(changed))
    subscription.on('error', err => { throw err })
    subscription.on('connected', nr => console.log(nr))
}


async function sendSMS(phone, otp){
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    const phoneNumber = phone;
    client.messages
    .create({
        body: `Your OTP for zk phone verification is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
    })
    .then(message => console.log(`SMS OTP sent to ${phoneNumber}: ${message.sid}`))
    .catch(error => console.error(`Error sending SMS OTP to ${phoneNumber}: ${error}`));
}

start()
// sendSMS('+9129114550', '4324');