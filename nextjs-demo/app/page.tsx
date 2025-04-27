"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import { createThirdwebClient } from "thirdweb";
import { ethereum } from "thirdweb/chains";
import {
	useActiveAccount,
	useActiveWallet,
	useConnect,
	useDisconnect,
	useWalletBalance,
} from "thirdweb/react";
import { createWallet, walletConnect } from "thirdweb/wallets";

// USDC contract address on Ethereum mainnet
const USDC_CONTRACT_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// Initialize thirdweb client
const client = createThirdwebClient({
	clientId: "",
});

// Define interface for transaction result
interface TransactionResult {
	transactionHash: string;
}

// Define interface for token balance
interface TokenBalance {
	value: bigint;
	decimals: number;
	symbol: string;
}

export default function Home() {
	const { connect } = useConnect();
	const { disconnect } = useDisconnect();
	const activeWallet = useActiveWallet();
	const activeAccount = useActiveAccount();
	const [recipient, setRecipient] = useState("");
	const [amount, setAmount] = useState("");
	const [transferType, setTransferType] = useState<"ETH" | "USDC">("ETH");
	const [isTransfering, setIsTransfering] = useState(false);
	const [transactionHash, setTransactionHash] = useState("");

	// Get ETH balance
	const ethBalance = useWalletBalance({
		address: activeAccount?.address,
		client,
		chain: ethereum,
	});

	// Get USDC balance
	const usdcBalance = useWalletBalance({
		address: activeAccount?.address,
		client,
		chain: ethereum,
		tokenAddress: USDC_CONTRACT_ADDRESS,
	});

	const handleConnect = async () => {
		try {
			// Using MetaMask wallet by default if available
			await connect(async () => {
				const wallet = createWallet("io.metamask");
				await wallet.connect({
					client,
					chain: ethereum,
				});
				return wallet;
			});
		} catch (error) {
			console.error("Failed to connect wallet:", error);
			try {
				// Fallback to WalletConnect if MetaMask isn't available
				await connect(async () => {
					const wallet = walletConnect();
					await wallet.connect({
						client,
						chain: ethereum,
					});
					return wallet;
				});
			} catch (err) {
				console.error("Failed to connect with WalletConnect:", err);
			}
		}
	};

	const handleTransfer = async () => {
		if (!activeWallet || !activeAccount || !recipient || !amount) return;

		setIsTransfering(true);
		setTransactionHash("");

		try {
			if (transferType === "ETH") {
				// For ETH transfer, we create a simple transaction
				const tx = {
					to: recipient,
					value: BigInt(Number.parseFloat(amount) * 10 ** 18), // Convert to wei
					chainId: ethereum.id, // Add chainId
				};

				// Send the transaction
				const result = await activeAccount.sendTransaction(tx);
				setTransactionHash(result.transactionHash);
			} else {
				// Transfer USDC (ERC20)
				// This is a simplification - for ERC20 transfers we would need to use a contract call
				// through the thirdweb SDK, but the exact method depends on the current SDK version
				console.error("USDC transfer not fully implemented");
				// As a placeholder, we're setting isTransfering to false
				setIsTransfering(false);
				return;
			}
		} catch (error) {
			console.error(`Failed to transfer ${transferType}:`, error);
		} finally {
			setIsTransfering(false);
		}
	};

	// Helper function to format token balance
	const formatBalance = (balance: TokenBalance | undefined) => {
		if (!balance) return "0";

		const value = balance.value?.toString() || "0";
		const decimals = balance.decimals || 18;
		const symbol = balance.symbol || "";

		// Simple formatting - divide by 10^decimals
		const formattedValue = (Number(value) / 10 ** decimals).toFixed(4);
		return `${formattedValue} ${symbol}`;
	};

	return (
		<main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24 bg-gradient-to-b from-blue-900 via-indigo-900 to-purple-900">
			<div className="z-10 max-w-5xl w-full">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold tracking-tight text-white mb-2">
						Web3 Wallet Dashboard
					</h1>
					<p className="text-lg text-blue-200">
						Connect your wallet and manage your crypto assets
					</p>
				</div>

				{!activeWallet ? (
					<Card className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-lg border-none shadow-2xl">
						<CardHeader>
							<CardTitle className="text-center text-white">
								Connect Your Wallet
							</CardTitle>
							<CardDescription className="text-center text-blue-200">
								Connect to Ethereum mainnet to check your balances and make
								transfers
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button
								className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
								onClick={handleConnect}
							>
								Connect Wallet
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-6 md:grid-cols-2">
						<Card className="bg-white/10 backdrop-blur-lg border-none shadow-2xl">
							<CardHeader>
								<CardTitle className="text-white">Account Details</CardTitle>
								<CardDescription className="text-blue-200">
									Your connected wallet information
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<Label className="text-sm text-blue-200">Address</Label>
									<p className="font-mono text-white break-all text-sm">
										{activeAccount?.address}
									</p>
								</div>
								<div className="space-y-2">
									<Label className="text-sm text-blue-200">Balances</Label>
									<div className="grid grid-cols-2 gap-4">
										<div className="p-3 rounded-lg bg-blue-900/50">
											<p className="text-sm text-blue-200">ETH</p>
											<p className="text-xl font-bold text-white">
												{ethBalance.isLoading
													? "Loading..."
													: ethBalance.error
														? "Error"
														: formatBalance(ethBalance.data)}
											</p>
										</div>
										<div className="p-3 rounded-lg bg-blue-900/50">
											<p className="text-sm text-blue-200">USDC</p>
											<p className="text-xl font-bold text-white">
												{usdcBalance.isLoading
													? "Loading..."
													: usdcBalance.error
														? "Error"
														: formatBalance(usdcBalance.data)}
											</p>
										</div>
									</div>
								</div>
							</CardContent>
							<CardFooter>
								<Button
									variant="outline"
									className="w-full text-white border-white/20 hover:bg-white/10"
									onClick={() => disconnect(activeWallet)}
								>
									Disconnect Wallet
								</Button>
							</CardFooter>
						</Card>

						<Card className="bg-white/10 backdrop-blur-lg border-none shadow-2xl">
							<CardHeader>
								<CardTitle className="text-white">Transfer Assets</CardTitle>
								<CardDescription className="text-blue-200">
									Send ETH or USDC to another address
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex gap-4">
									<Button
										variant={transferType === "ETH" ? "default" : "outline"}
										className={
											transferType === "ETH"
												? "flex-1 bg-blue-600 hover:bg-blue-700"
												: "flex-1 text-white border-white/20 hover:bg-white/10"
										}
										onClick={() => setTransferType("ETH")}
									>
										ETH
									</Button>
									<Button
										variant={transferType === "USDC" ? "default" : "outline"}
										className={
											transferType === "USDC"
												? "flex-1 bg-blue-600 hover:bg-blue-700"
												: "flex-1 text-white border-white/20 hover:bg-white/10"
										}
										onClick={() => setTransferType("USDC")}
									>
										USDC
									</Button>
								</div>

								<div className="space-y-2">
									<Label htmlFor="recipient" className="text-blue-200">
										Recipient Address
									</Label>
									<Input
										id="recipient"
										placeholder="0x..."
										value={recipient}
										onChange={(e) => setRecipient(e.target.value)}
										className="bg-blue-900/30 border-white/10 text-white"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="amount" className="text-blue-200">
										Amount
									</Label>
									<Input
										id="amount"
										placeholder={transferType === "ETH" ? "0.01" : "10"}
										value={amount}
										onChange={(e) => setAmount(e.target.value)}
										className="bg-blue-900/30 border-white/10 text-white"
									/>
								</div>

								{transactionHash && (
									<div className="p-3 bg-green-900/30 rounded-lg">
										<p className="text-sm text-green-300">
											Transaction successful!
										</p>
										<a
											href={`https://etherscan.io/tx/${transactionHash}`}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs text-blue-300 hover:underline break-all"
										>
											{transactionHash}
										</a>
									</div>
								)}
							</CardContent>
							<CardFooter>
								<Button
									className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50"
									onClick={handleTransfer}
									disabled={
										isTransfering ||
										!recipient ||
										!amount ||
										transferType === "USDC"
									}
								>
									{isTransfering ? "Processing..." : `Send ${transferType}`}
								</Button>
							</CardFooter>
						</Card>
					</div>
				)}
			</div>

			<footer className="mt-12 text-center text-sm text-blue-300">
				<p>Powered by thirdweb SDK</p>
			</footer>
		</main>
	);
}
