import { ethers } from 'ethers'
import { SiweMessage } from 'siwe'
import './scss/style.scss';

const input = document.getElementById('input')
const saveBtn = document.getElementById('saveBtn')
const loadBtn = document.getElementById('loadBtn')
const appDiv = document.getElementById('app')

const connectWalletBtn = document.getElementById('connectWalletBtn')
const siweBtn = document.getElementById('siweBtn')
const loggedInUser = document.getElementById('loggedInUser')
const ensAvatar = document.getElementById('ensAvatar')

const loggedWrap = document.querySelector('.logged-wrap');
const loggedWrapImg = document.querySelector('.logged-wrap__img');
const changedText = document.querySelector('.changed-text');

saveBtn.onclick = save
loadBtn.onclick = load
connectWalletBtn.onclick = connectWallet
siweBtn.onclick = signInWithEthereum
ensAvatar.onerror = function () { 
  console.log('user does not have an ensAvatar')
  ensAvatar.style.display = 'none' 
}

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()
const domain = window.location.hostname

function connectWallet () {
  provider.send('eth_requestAccounts', [])
    .then(_ => {
      connectWalletBtn.style.display = 'none'
      siweBtn.style.display = 'block'
    }, () => console.log('user rejected request'))
}

async function checkWalletIsConnected () {
  if (await signer.getAddress() !== null) {
    connectWalletBtn.style.display = 'none'
    siweBtn.style.display = 'block'
  }
}

async function createSiweMessage (statement) {
  return new SiweMessage({
    domain,
    address: await signer.getAddress(),
    statement,
    uri: 'http://' + domain,
    version: '1',
    chainId: '1'
  }).signMessage()
}

async function signInWithEthereum () {

  const network = await signer.provider.getNetwork();

  if(network.chainId !== 1) {
    document.querySelector('.alert').style.display = 'flex';
    return
  }

  const message = await createSiweMessage('Sign in with Ethereum to the app.')

  const signature = await signer.signMessage(message)

  const headers = new window.Headers()
  headers.append('Accept', 'text/plain')

  const options = {
    body: JSON.stringify({
      action: 'signIn',
      message,
      signature
    }),
    headers: headers,
    method: 'post'
  }

  window.fetch('http://localhost:8888', options).then(async response => {
    if (response.ok) {
      signer.getAddress().then(async address => {
        const ensName = await provider.lookupAddress(address)
        input.value = await response.text()
        siweBtn.style.display = 'none'
        appDiv.style.display = 'flex';
        loggedWrap.style.display = 'flex';
        changedText.innerHTML = 'Try typing in and saving some text!'

        if (ensName === null) {
          const copyBtn = document.createElement('span');

          copyBtn.onclick = function() {
            navigator.clipboard.writeText(address)
          }

          copyBtn.innerHTML =  '<img src="/images/icon-connection.svg" alt="#">';
          copyBtn.classList.add('logged-in__img');

          loggedInUser.appendChild(copyBtn);

          const addressElement = document.createElement('span');
          addressElement.innerHTML = `${address.slice(0,5)} ... ${address.slice(-4)}`
          addressElement.classList.add('logged-in__adress');

          loggedInUser.appendChild(addressElement);
           
          loggedWrapImg.style.display = 'none'

        } else {
          loggedInUser.innerHTML = `${ensName}`
          ensAvatar.src = `https://metadata.ens.domains/mainnet/avatar/${ensName}`
        }
      }, () => console.log('failed to get active address'))
    } else {
      console.log('response to SIWE request was not successful')
    }
  })
}

async function load () {
  const message = await createSiweMessage('Load your previously saved input.')

  const signature = await signer.signMessage(message)

  const headers = new window.Headers()
  headers.append('Accept', 'text/plain')

  const options = {
    body: JSON.stringify({
      action: 'load',
      message,
      signature
    }),
    headers: headers,
    method: 'post'
  }

  window.fetch('http://localhost:8888', options).then(async response => {
    input.value = await response.text()
  })
}

async function save () {
  const message = await createSiweMessage('Save your current input.')

  const signature = await signer.signMessage(message)

  const headers = new window.Headers()

  const options = {
    body: JSON.stringify({
      action: 'save',
      content: input.value,
      message,
      signature
    }),
    headers: headers,
    method: 'post'
  }

  window.fetch('http://localhost:8888', options)
}

checkWalletIsConnected()
