import { ethers } from 'ethers';
import QRCode from 'qrcode';

// Default BIP-39 mnemonic fallback if MNEMONIC env var is not configured
const DEFAULT_MNEMONIC = 'test test test test test test test test test test test junk';

export function getMnemonic(): string {
  const envMnemonic = process.env.MNEMONIC?.trim();
  if (envMnemonic && ethers.Mnemonic.isValidMnemonic(envMnemonic)) {
    return envMnemonic;
  }
  return DEFAULT_MNEMONIC;
}

export interface DerivedWalletInfo {
  address: string;
  derivationIndex: number;
  derivationPath: string;
  network: string;
  qrCode: string | null;
}

const derivedWalletCache = new Map<string, DerivedWalletInfo>();
const qrCodeCache = new Map<string, string>();

/**
 * Generate a unique BEP-20 address from HD wallet using derivation index
 * Matches cryptofd/app/api/wallet/route.ts: m/44'/60'/0'/0/${index}
 */
export function generateAddress(mnemonic: string, index: number): string {
  const cacheKey = `${mnemonic}:${index}`;
  const cached = derivedWalletCache.get(cacheKey);
  if (cached) {
    return cached.address;
  }
  const wallet = ethers.HDNodeWallet.fromPhrase(
    mnemonic,
    undefined,
    `m/44'/60'/0'/0/${index}`
  );
  return wallet.address.toLowerCase();
}

export async function generateAddressQrCode(address: string): Promise<string | null> {
  const cleanAddr = address.toLowerCase();
  const cachedQr = qrCodeCache.get(cleanAddr);
  if (cachedQr) {
    return cachedQr;
  }
  try {
    const dataUrl = await QRCode.toDataURL(address, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    if (dataUrl) {
      qrCodeCache.set(cleanAddr, dataUrl);
    }
    return dataUrl;
  } catch (err) {
    console.error('QR code generation error:', err);
    return null;
  }
}

export async function deriveUserBep20Wallet(index: number): Promise<DerivedWalletInfo> {
  const mnemonic = getMnemonic();
  const cacheKey = `${mnemonic}:${index}`;
  const cached = derivedWalletCache.get(cacheKey);
  if (cached && cached.qrCode) {
    return cached;
  }

  const derivationPath = `m/44'/60'/0'/0/${index}`;
  const address = generateAddress(mnemonic, index);
  const qrCode = await generateAddressQrCode(address);

  const result: DerivedWalletInfo = {
    address,
    derivationIndex: index,
    derivationPath,
    network: 'BEP-20 (BSC)',
    qrCode,
  };
  derivedWalletCache.set(cacheKey, result);
  return result;
}
