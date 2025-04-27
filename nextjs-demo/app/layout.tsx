import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createThirdwebClient } from "thirdweb";
import { ThirdwebProvider } from "thirdweb/react";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Web3 Wallet Dashboard",
	description: "Connect your web3 wallet and manage your assets",
};

// Initialize thirdweb client
const client = createThirdwebClient({
	clientId: "68e6e8bde01be15421084388ced2f413",
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<ThirdwebProvider>{children}</ThirdwebProvider>
			</body>
		</html>
	);
}
