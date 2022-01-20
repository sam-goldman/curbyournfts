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

const getDisplayAccount = (account) => {
  const checksumAccount = ethers.utils.getAddress(account);
  const firstHalf = checksumAccount.slice(0, 6);
  const secondHalf = checksumAccount.slice(-4);
  return `${firstHalf}...${secondHalf}`;
};

function App() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [supply, setSupply] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isBtnDisabled, setIsBtnDisabled] = useState(false);
  const [isCorrectChainId, setIsCorrectChainId] = useState(null);

  let contract;
  if (provider) {
    const signer = provider.getSigner();
    contract = new ethers.Contract(contractAddress, MyNFT.abi, signer);
  }

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
        const handleIsConnected = async () => {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          handleChainId(chainId);
        };

        handleIsConnected();
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
          setErrorMessage(null);
          setAccount(null);
          setIsBtnDisabled(false);
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
        setErrorMessage('You are disconnected from the network! Please cancel the network request in MetaMask.');
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

  const handleMintBtnClick = async () => {
    if (isBtnDisabled) {
      return;
    }
    setIsBtnDisabled(true);

    try {
      await contract.mintPublic();
      const newSupply = parseInt(supply) + 1;
      setSupply(newSupply);
    } catch (error) {
      console.log(error);
      if (error.code === -32603) {
        let message;
        if (error.hasOwnProperty('data') && error.data.hasOwnProperty('message')) {
          message = error.data.message;
        }
        else if (error.hasOwnProperty('message')) {
          message = error.message;
        }

        if (message.includes(revertMessages.AddressReachedPublicMintingLimit)) {
          setErrorMessage('You have reached your minting limit!');
        }
      }
    }
    setIsBtnDisabled(false);
  };

  const handleChainId = (chainId) => {
    if (chainId === correctChainId) {
      setIsCorrectChainId(true);
    }
    else {
      setIsCorrectChainId(false);
    }
  };

  let network;
  let isMintBtn = false;
  if (isMetaMaskInstalled && isCorrectChainId && account) {
    network = 'Localhost 8545'; // TODO: change later
    isMintBtn = true;
  }

  const styleNetworkAndAccount = "border border-inherit bg-white h-9 w-40 rounded-xl text-center py-1";
  const styleBtn = "mt-20 bg-gradient-to-r from-red-600 via-pink-400 to-indigo-500 hover:from-red-500 hover:via-pink-400 hover:to-indigo-400 disabled:from-red-200 disabled:via-pink-200 disabled:to-indigo-200 text-white text-xl rounded-2xl h-10 w-60 transition hover:scale-110";
  return (
    <div>
      <div className="flex items-center justify-end space-x-4 mr-4 mt-4">
        {network && <div className={styleNetworkAndAccount}>{network}</div>}
        {account && <div className={styleNetworkAndAccount}>{getDisplayAccount(account)}</div>}
      </div>
      <h1 className="text-5xl text-center font-light mt-32">NFT PROJECT</h1>
      <div className="flex flex-col items-center">
        {isMintBtn ? (
          <button
            disabled={isBtnDisabled || errorMessage}
            onClick={() => handleMintBtnClick()}
            className={styleBtn}>
              MINT
          </button>
        ) : (
          <button
            disabled={isBtnDisabled || errorMessage}
            onClick={() => handleWalletBtnClick()}
            className={styleBtn}>
              CONNECT WALLET
          </button>
        )}

        {errorMessage && <div className="mt-10">{errorMessage}</div>}
        
        <div className="mt-2">Minted: {supply}/50</div>
        <div>description</div>
        <div className="flex items-center justify-end space-x-4 mr-4 mt-4">
           <a href="" className="border border-inherit bg-white rounded-xl">OpenSea</a>
           <a href="">Contract</a>
        </div>
      </div>
    </div>
  );
}

export default App;