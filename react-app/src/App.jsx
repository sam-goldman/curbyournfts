import './App.css';
import { ethers } from 'ethers';
import { useState, useEffect } from 'react';
import MyNFT from './artifacts/contracts/MyNFT.sol/MyNFT.json';

const adminAddresses = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
];

const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// TODO: change correctChainId when you switch from localhost
const correctChainId = '0x539';

const revertMessages = {
  NumReservedTokensCannotBeZero: "numReservedTokens cannot be zero",
  NumReservedTokensExceedsMax: "number of tokens requested exceeds max reserved",
  AddressReachedPublicMintingLimit: "this address has reached its minting limit",
  MaxNumberPublicTokensMinted: "maximum number of public tokens have been minted",
  PublicTokensExceedsTmpMax: "there are currently no more public tokens to mint",
  NewTmpMaxExceedsMaxPublic: "cannot change temporary public value to exceed max value"
};

const isMetaMaskInstalled = Boolean(window.ethereum && window.ethereum.isMetaMask);

const shortenAccount = (account) => {
  const firstHalf = account.slice(0, 6);
  const secondHalf = account.slice(-4);
  return `${firstHalf}...${secondHalf}`;
};

function App() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [supply, setSupply] = useState(null);
  const [isMintBtn, setIsMintBtn] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isBtnDisabled, setIsBtnDisabled] = useState(false);
  const [isCorrectChainId, setIsCorrectChainId] = useState(null);

  // const contract = new ethers.Contract(contractAddress, MyNFT.abi, providerOrSigner);

  useEffect(() => {
    const getSupply = async () => {
      const provider = new ethers.providers.JsonRpcProvider();
      const contract = new ethers.Contract(contractAddress, MyNFT.abi, provider);

      try {
        let supply = await contract.totalSupply();
        setSupply(parseInt(supply));
      } catch (e) {
        console.error('Error calling totalSupply without MetaMask installed', e);
      }
    };

    getSupply();
  }, []);

  useEffect(() => {
    if (isMetaMaskInstalled) {
      if (window.ethereum.isConnected()) {

        
        const chainId = await getChainId();
        handleChainId(chainId);
      }

      const handleConnect = (connectInfo) => {
        const chainId = connectInfo.chainId;
        handleChainId(chainId);
      }

      window.ethereum.on('connect', handleConnect);

      return () => window.ethereum.removeListener('connect', handleConnect);
    }
  }, []);

  useEffect(() => {
    if (isMetaMaskInstalled && isCorrectChainId) {
      const getInitialConnection = async () => {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const account = accounts[0];
          const provider = new ethers.providers.Web3Provider(window.ethereum);

          setProvider(provider);
          setAccount(account);
          setIsMintBtn(true);
          setNetwork('Localhost 8545');
        }
      }

      getInitialConnection();
    }
  }, [isCorrectChainId]);

  useEffect(() => {
    if (isMetaMaskInstalled && isCorrectChainId !== null) {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
          setProvider(null);
          setIsMintBtn(false);
          setErrorMessage(null);
          setAccount(null);
          setNetwork(null);
        }
        else if (isCorrectChainId === false) {
          setErrorMessage('Please connect to the correct network!');
        }
        else {
          const account = accounts[0];
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(provider);
          setAccount(account);
          setErrorMessage(null);
          setIsMintBtn(true);
          setNetwork('Localhost 8545');
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    }
  }, [isCorrectChainId]);

  useEffect(() => {
    if (isMetaMaskInstalled) {
      const handleChainChanged = () => {
        window.location.reload();
      }

      window.ethereum.on('chainChanged', handleChainChanged);

      return () => window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
  }, []);

  useEffect(() => {
    if (isMetaMaskInstalled) {
      const handleDisconnect = (error) => {
        setErrorMessage('You have been disconnected from the network! Please reload page.');
        console.error('User disconnected from network', error);
      };
  
      window.ethereum.on('disconnect', handleDisconnect);
  
      return () => window.ethereum.removeListener('disconnect', handleDisconnect);
    }
  }, []);

  const handleWalletBtnClick = async () => {
    if (isBtnDisabled) {
      return;
    }
    setIsBtnDisabled(true);

    if (isMetaMaskInstalled) {
      try {
        // If this connection request is successful, then handleAccountsChanged is automatically called.
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (accounts > 0 && isCorrectChainId === false) {
          setErrorMessage('Please connect to the correct network!');
        }
      } catch (e) {
        console.error("Error when requesting user's MetaMask account", e);
      }
    }
    else {
      setErrorMessage('Please install MetaMask, then refresh this page!');
    }
    setIsBtnDisabled(false);
  }

  const handleChainId = (chainId) => {
    console.log(chainId)
    if (chainId === correctChainId) {
      setIsCorrectChainId(true);
    }
    else {
      setIsCorrectChainId(false);
    }
  };

  // TODO: this returns a promise
  const getChainId = async () => {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId;
  };

  return (
    <div className="App">
      {network && <div>{network}</div>}
      {account && <div>{shortenAccount(account)}</div>}
      <h1>NFT</h1>
      <h2>PROJECT</h2>
      
      {isMintBtn ? (
        <button
          disabled={isBtnDisabled}>
            MINT
        </button>
      ) : (
        <button
          disabled={isBtnDisabled}
          onClick={() => handleWalletBtnClick()}>
            CONNECT WALLET
        </button>
      )}

      {errorMessage && <div>{errorMessage}</div>}
      
      <p>Minted: {supply}/50</p>
      {/* {mintingLimitMsg} */}
      <div>description</div>
      <div><a href="">OpenSea</a> | <a href="">Contract</a></div>
    </div>
  );
}

export default App;