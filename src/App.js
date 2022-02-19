import React, { useEffect, useState } from "react"
import "./styles/App.css"
import twitterLogo from "./assets/twitter-logo.svg"
import polygonLogo from "./assets/polygonlogo.png"
import ethLogo from "./assets/ethlogo.png"
import { ethers } from "ethers"
import abi from "./utils/DomainService.json"
import { networks } from "./utils/networks"

// Constants
const TWITTER_HANDLE = "heyztb"
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`
const tld = "matic"
const CONTRACT_ADDRESS = "0x2499459511F4bfE63972186f8E85BB5578d73F81"
const contractABI = abi.abi

const App = () => {
  const [network, setNetwork] = useState("")
  const [currentAccount, setCurrentAccount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [domain, setDomain] = useState("")
  const [record, setRecord] = useState("")
  const [domains, setDomains] = useState([])

  const connectWallet = async () => {
    try {
      const { ethereum } = window

      if (!ethereum) {
        alert("Get MetaMask -> https://metamask.io/")
        return
      }

      // Fancy method to request access to account.
      const accounts = await ethereum.request({ method: "eth_requestAccounts" })

      // Boom! This should print out public address once we authorize Metamask.
      console.log("Connected", accounts[0])
      setCurrentAccount(accounts[0])
    } catch (error) {
      console.log(error)
    }
  }

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window

    if (!ethereum) {
      console.log("Make sure you have MetaMask!")
      return
    } else {
      console.log("We have the ethereum object", ethereum)
    }

    const accounts = await ethereum.request({ method: "eth_accounts" })
    if (accounts.length !== 0) {
      const account = accounts[0]
      setCurrentAccount(account)
    } else {
      console.error("no authorized account found")
    }

    const chainId = await ethereum.request({ method: "eth_chainId" })
    setNetwork(networks[chainId])

    const handleChainChanged = (_chainId) => {
      window.location.reload()
    }

    ethereum.on("chainChanged", handleChainChanged)
  }

  const switchNetwork = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x13881" }],
        })
      } catch (e) {
        if (e.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x13881",
                  chainName: "Polygon Mumbai Testnet",
                  rpcUrls: ["https://rpc-mumbai.maticvigil.com"],
                  nativeCurrency: {
                    name: "Mumbai Matic",
                    symbol: "MATIC",
                    decimals: 18,
                  },
                  blockExplorerUrls: ["https://mumbai.polygonscan.com"],
                },
              ],
            })
          } catch (e) {
            console.error(e)
          }
        }
        console.log(e)
      }
    } else {
      alert(
        "metamask is not installed. please install it to use this app https://metamask.io/download"
      )
    }
  }

  const renderNotConnectedContainer = () => (
    <div className="connect-wallet-container">
      <img
        src="https://media.giphy.com/media/vz8dpAMKuR1v8iTTB3/giphy.gif"
        alt="Polygon gif"
      />
      <button
        className="cta-button connect-wallet-button"
        onClick={connectWallet}
      >
        Connect Wallet
      </button>
    </div>
  )

  const renderInputForm = () => {
    if (network !== "Polygon Mumbai Testnet") {
      return (
        <div className="connect-wallet-container">
          <h2>Please switch to Polygon Mumbai Testnet</h2>
          <button className="cta-button mint-button" onClick={switchNetwork}>
            Click here to switch
          </button>
        </div>
      )
    }

    return (
      <div className="form-container">
        <div className="first-row">
          <input
            type="text"
            value={domain}
            placeholder="domain"
            onChange={(e) => setDomain(e.target.value)}
          />
          <p className="tld"> {tld} </p>
        </div>

        <input
          type="text"
          value={record}
          placeholder="whats ur ninja power"
          onChange={(e) => setRecord(e.target.value)}
        />

        {isEditing ? (
          <div className="button-container">
            <button
              className="cta-button mint-button"
              disabled={isLoading}
              onClick={updateDomain}
            >
              Set record
            </button>
            <button
              className="cta-button mint-button"
              onClick={() => {
                setDomain("")
                setRecord("")
                setIsEditing(false)
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="cta-button mint-button"
            disabled={isLoading}
            onClick={mintDomain}
          >
            Mint
          </button>
        )}
      </div>
    )
  }

  const renderDomains = () => {
    if (currentAccount && domains.length > 0) {
      return (
        <div className="mint-container">
          <p className="subtitle"> Recently minted domains!</p>
          <div className="mint-list">
            {domains.map((domain, index) => {
              return (
                <div className="mint-item" key={index}>
                  <div className="mint-row">
                    <a
                      className="link"
                      href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${domain.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <p className="underlined">
                        {" "}
                        {domain.name}
                        {"."}
                        {tld}{" "}
                      </p>
                    </a>
                    {/* If mint.owner is currentAccount, add an "edit" button*/}
                    {domain.owner.toLowerCase() ===
                    currentAccount.toLowerCase() ? (
                      <button
                        className="edit-button"
                        onClick={() => editRecord(domain.name)}
                      >
                        <img
                          className="edit-icon"
                          src="https://img.icons8.com/metro/26/000000/pencil.png"
                          alt="Edit button"
                        />
                      </button>
                    ) : null}
                  </div>
                  <p> {domain.record} </p>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
  }

  const editRecord = (name) => {
    setIsEditing(true)
    setDomain(name)
  }

  const fetchMints = async () => {
    try {
      const { ethereum } = window
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum)
        const signer = provider.getSigner()
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractABI,
          signer
        )

        const names = await contract.getAllNames()

        const domainRecords = await Promise.all(
          names.map(async (name) => {
            const domainRecord = await contract.records(name)
            const owner = await contract.domains(name)
            return {
              id: names.indexOf(name),
              name,
              record: domainRecord,
              owner,
            }
          })
        )
        console.log("domain records fetched", domainRecords)
        setDomains(domainRecords)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const mintDomain = async () => {
    if (!domain) return
    if (domain.length < 3) {
      alert("Domain must be at least 3 characters long")
      return
    }

    const price =
      domain.length === 3 ? "0.5" : domain.length === 4 ? "0.3" : "0.1"

    try {
      const { ethereum } = window
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum)
        const signer = provider.getSigner()
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractABI,
          signer
        )

        setIsLoading(true)
        const registerTx = await contract.register(domain, {
          value: ethers.utils.parseEther(price),
        })

        await registerTx.wait()
        console.log(
          `registered domain ${domain}, tx: https://mumbai.polygonscan.com/tx/${registerTx.hash}`
        )

        const setRecordTx = await contract.setRecord(domain, record)
        await setRecordTx.wait()
        console.log(
          `set record: ${record} : on domain ${domain}, tx: https://mumbai.polygonscan.com/tx/${setRecordTx.hash}`
        )

        await fetchMints()

        setRecord("")
        setDomain("")
        setIsLoading(false)
      }
    } catch (e) {
      setIsLoading(false)
      console.error(e)
    }
  }

  const updateDomain = async () => {
    if (!record || !domain) return
    setIsLoading(true)

    try {
      const { ethereum } = window

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum)
        const signer = provider.getSigner()
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractABI,
          signer
        )

        const tx = await contract.setRecord(domain, record)
        await tx.wait()

        fetchMints()
        setRecord("")
        setDomain("")
      }
    } catch (e) {
      console.error(e)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    checkIfWalletIsConnected()
  }, [])

  useEffect(() => {
    if (network === "Polygon Mumbai Testnet") {
      fetchMints()
    }
  }, [network, currentAccount])

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <header>
            <div className="left">
              <p className="title">⛓ Matic Name Service</p>
              <p className="subtitle">
                A domain name service deployed on Polygon
              </p>
            </div>
            <div className="right">
              <img
                className="logo"
                src={network.includes("Polygon") ? polygonLogo : ethLogo}
                alt="Network Logo"
              />
              {currentAccount ? (
                <p>
                  {" "}
                  Wallet: {currentAccount.slice(0, 6)}...
                  {currentAccount.slice(-4)}{" "}
                </p>
              ) : (
                <p> Not connected </p>
              )}
            </div>
          </header>
        </div>

        {!currentAccount && renderNotConnectedContainer()}
        {currentAccount && renderInputForm()}
        {domains && renderDomains()}

        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  )
}

export default App
