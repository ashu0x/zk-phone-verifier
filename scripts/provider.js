import { ethers } from "ethers";

export const getProviderOrSigner = async (needSigner = false) => {
    console.log(window.ethereum)
    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);

    const { chainId } = await web3Provider.getNetwork();
    // if (chainId !== 5) {
    //   window.alert("Change the network to Goerli");
    //   throw new Error("Change network to Goerli");
    // }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
};