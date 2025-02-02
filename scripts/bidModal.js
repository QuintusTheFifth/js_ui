const $ = require("jquery");
const {
  abi: citABI,
} = require("../artifacts/incentiveToken/contracts/Auction.sol/Auction.json");
const ethers = require("ethers");
require("dotenv").config();
const { sepoliaBaseToken, gnosisBaseToken } = require("../src/tokens");
const {
  sepoliaWallet,
  gnosisWallet,
  sepoliaProvider,
  gnosisProvider,
} = require("../src/providers");
const isTestnet = process.env.IS_TESTNET === "true";
let CIT, baseToken, wallet, provider;

if (isTestnet) {
  CIT = new ethers.Contract(process.env.SEPOLIA_CIT, citABI, sepoliaWallet);
  baseToken = sepoliaBaseToken;
  wallet = sepoliaWallet;
  provider = sepoliaProvider;
} else {
  CIT = new ethers.Contract(process.env.GNOSIS_CIT, citABI, gnosisWallet);
  baseToken = gnosisBaseToken;
  wallet = gnosisWallet;
  provider = gnosisProvider;
}

let balanceVal;
const button = document.getElementById("signAndBid");
const text = document.getElementById("bidText");
const loader = document.getElementById("bidLoader");
$("#token").text(isTestnet ? "wETH" : "wXDAI");

$("#balance").text("...");
baseToken.balanceOf(wallet.address).then((result) => {
  balanceVal = ethers.utils.formatEther(result);
  $("#balance").text(
    parseFloat(balanceVal).toFixed(3) + `${isTestnet ? " wETH" : " wXDAI"}`
  );
});
$("#signAndBid").on("click", async () => {
  const bidAmount = parseFloat($("#bidAmount").val());
  if (
    bidAmount == "" ||
    bidAmount == null ||
    bidAmount == undefined ||
    bidAmount == 0 ||
    isNaN(bidAmount)
  ) {
    window.alert("Please enter a valid bid amount");
    return;
  }
  const balance = parseFloat(balanceVal);
  if (bidAmount > balance) {
    window.alert(
      `Please enter a bid lower than your current ${
        isTestnet ? "wETH" : "wXDAI"
      } balance`
    );
    return;
  }
  const currentTopBid = parseFloat(
    ethers.utils.formatEther(await CIT.currentTopBid())
  );

  try {
    if (bidAmount > currentTopBid) {
      showLoadingAnimation();
      let currentGasPrice = await provider.getGasPrice();
      await baseToken.approve(
        CIT.address,
        ethers.utils.parseEther(bidAmount.toString()),
        { gasLimit: 300000, gasPrice: currentGasPrice }
      );
      const tx = await CIT.bid(ethers.utils.parseEther(bidAmount.toString()), {
        gasLimit: 300000,
        gasPrice: currentGasPrice,
      });
      const receipt = await tx.wait();
      console.log(receipt);
      if (receipt.status === 1) {
        console.log("Transaction was successful");
        window.alert(
          `Transaction was successful! \nNetwork: ${
            isTestnet ? "Sepolia" : "Gnosis Chain"
          } \nTransaction Hash: ${tx.hash}`
        );
      } else {
        console.log("Transaction failed");
        window.alert(`Transaction failed! \nPlease check your transaction.`);
      }
      loader.style.display = "none";
      text.style.display = "inline";
      button.disabled = false;
      button.style.pointerEvents = "";
    } else {
      window.alert(
        "Bid too low. Please enter a bid higher than the current top bid: " +
          currentTopBid +
          `${isTestnet ? " wETH" : " wXDAI"}`
      );
    }
  } catch (error) {
    window.alert("Transaction failed, check console for more details.");
    console.log(error);
    loader.style.display = "none";
    text.style.display = "inline";
    button.disabled = false;
    button.style.pointerEvents = "";
  }
});

function showLoadingAnimation() {
  button.disabled = true;
  button.style.pointerEvents = "none";
  text.style.display = "none";
  loader.style.display = "block";
}
