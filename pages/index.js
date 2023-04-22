import { useRef,useEffect, useState } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import { Grid, Box } from "@mui/material";
import { getProviderOrSigner } from "../scripts/provider";
import PhoneInput from "react-phone-input-2";
import 'react-phone-input-2/lib/style.css'
import axios from "axios";
import crypto from "crypto";
import { contractABI, contractAddress, publicKey } from "../scripts/abi";
import OTPInput from "react-otp-input";


const ethers = require("ethers");

function HomePage() {

    const [walletConnected, setWalletConnected] = useState(false);
    const [proof, setProof] = useState({});
    const [phone, setPhone] = useState();
    const [wallet, setWallet] = useState("");
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [verified, setVerified] = useState(false);
    const [loading, setLoading] = useState(false);
    const web3ModalRef = useRef();

    const generateProof=async()=>{
        try {
            const phoneArr = phone.split("");
            const res = await axios.post("http://20.100.177.200:3001/generate-proof", {arr: phoneArr});
            setProof(res.data)
            console.log(proof)
            console.log(res)
        } catch (error) {
            alert(error)
            console.log(error)
        }
    }

    const registerAddress = async()=>{
        try {
            // const publicKey = fs.readFileSync('publickey.pem', 'utf-8');
            const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(phone, 'utf-8'));
            const hexEncrypted = encrypted.toString('hex');
            const signer = await getProviderOrSigner(true);
            const contract= new ethers.Contract(contractAddress, contractABI ,signer);
            await contract.register(9,proof.proofJson.proof,proof.proofJson.inputs, wallet, `0x${hexEncrypted}`);
            setOtpSent(true);
        } catch (error) {
            console.log(error)
        }
    }

    const verifyOTP = async()=>{
        try {
        const signer = await getProviderOrSigner(true);
        const contract= new ethers.Contract(contractAddress, contractABI ,signer);
        await contract.verify(otp, wallet);
        } catch (error) {
            console.log(error)
            alert(error.message)
        }
            
    }

    const checkVerifiedStatus = async(address)=>{
        try {
        const provider = await getProviderOrSigner();
        const contract= new ethers.Contract(contractAddress, contractABI, provider);
        const res = await contract.verified(address);
        setVerified(res)
        } catch (error) {
            console.log(error)
            alert(error.message)
        }
            
    }

    const connectWallet = async () => {
        try {
            await window.ethereum.enable()
          const provider = await getProviderOrSigner();
          const signer = provider.getSigner();
          const address = await signer.getAddress();
          console.log(provider)
          setWallet(address);
          setWalletConnected(true);
          console.log("ad", address, wallet)
          checkVerifiedStatus(address)
        } catch (err) {
          console.error(err);
        }
    };

    useEffect(() => {
        if (!walletConnected) {
        //   web3ModalRef.current = new Web3Modal({
        //     network: "sepolia",
        //     providerOptions: {},
        //     disableInjectedProvider: false,
        //   });
            connectWallet();
        }
      }, [walletConnected]);


      const renderButton = () => {
        if (walletConnected) {
          if (verified) {
            return (
              <div className={styles.description}>
                Address {wallet} Verified!
              </div>
            );
          } else if (loading) {
            return <button className={styles.button}>Loading...</button>;
          } else {
            return (
                <>
            <div className={styles.description}>
                Connected Wallet : {wallet}
              </div>

              {!verified ? (
                <div className={styles.description}>
                    Verify Your Wallet
                </div>
            ) : (
               "Wallet already verified"
            )}
              

              <PhoneInput
                country={'in'}
                onChange={phone => setPhone(phone.substring(2))}
            />
             <button onClick={generateProof} className={styles.button}>
                    Generate Proof
            </button>
            <div>
            {proof.proofJson ? (
                <div>
                <div className={styles.json}>
                    Proof
                   {JSON.stringify(proof.proofJson)}
                </div>
                <button onClick={registerAddress} className={styles.button}>
                        Verify Phone
                </button>
                </div>
            ) : (
               ""
            )}
            </div>

            <div>
                {otpSent ? (
                    <div>
                         <OTPInput
                            value={otp}
                            onChange={setOtp}
                            numInputs={6}
                            renderSeparator={<span>-</span>}
                            renderInput={(props) => <input {...props} />}
                        />
                        <button onClick={verifyOTP} className={styles.button}>
                                Verify OTP
                        </button>
                    </div>
                    
                ) : (
                ""
                )}
            </div>

              </>
            );
          }
        } else {
          return (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          );
        }
      };
      console.log(walletConnected)
    return (
        <div>
        <Head>
        <title>Zk Phone Verifier</title>
        <meta name="description" content="Zk Phone Verifier" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
      <div>
        <h1 className={styles.title}>Zk Phone Verifier!</h1>
        {renderButton()}
      </div>
      <div>
        <img className={styles.image} src="./crypto-devs.svg" />
      </div>
    </div>

    <footer className={styles.footer}>
      Made with &#10084; by ashu0x
    </footer>
    </div>
    )
}
  
export default HomePage