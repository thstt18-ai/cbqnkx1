import { ethers } from 'ethers';
import { configLoader } from './configLoader';

let provider: ethers.JsonRpcProvider | null = null;
let providerInitialized = false;
let lastRpcUrl = '';

const DEFAULT_RPCS = {
  testnet: [
    'https://rpc-amoy.polygon.technology',
    'https://polygon-amoy.g.alchemy.com/v2/demo',
    'https://polygon-amoy-bor-rpc.publicnode.com'
  ],
  mainnet: [
    'https://polygon-rpc.com',
    'https://polygon-bor-rpc.publicnode.com',
    'https://rpc.ankr.com/polygon'
  ]
};

async function testRpcConnection(url: string): Promise<boolean> {
  try {
    const testProvider = new ethers.JsonRpcProvider(url, undefined, {
      staticNetwork: true,
      batchMaxCount: 1
    });

    await Promise.race([
      testProvider.getNetwork(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);

    return true;
  } catch (error) {
    console.log(`RPC ${url} недоступен:`, error instanceof Error ? error.message : 'unknown');
    return false;
  }
}

export async function initializeProvider(): Promise<void> {
  if (providerInitialized && provider) {
    return;
  }

  const config = configLoader.getConfig();
  const isTestnet = config.networkMode !== 'mainnet';

  // Приоритет: переменные окружения > конфиг > defaults
  const configuredRpc = isTestnet 
    ? (process.env.POLYGON_TESTNET_RPC_URL || config.polygonTestnetRpcUrl)
    : (process.env.POLYGON_RPC_URL || config.polygonRpcUrl);

  const rpcsToTry = [
    ...(configuredRpc ? [configuredRpc] : []),
    ...(isTestnet ? DEFAULT_RPCS.testnet : DEFAULT_RPCS.mainnet)
  ];

  console.log(`🔍 Поиск рабочего RPC для ${isTestnet ? 'Amoy Testnet' : 'Polygon Mainnet'}...`);

  for (const rpcUrl of rpcsToTry) {
    if (rpcUrl === lastRpcUrl && provider) {
      console.log(`✅ Используется существующее подключение: ${rpcUrl.substring(0, 40)}...`);
      providerInitialized = true;
      return;
    }

    console.log(`🔗 Тестирование RPC: ${rpcUrl.substring(0, 50)}...`);

    const isWorking = await testRpcConnection(rpcUrl);

    if (isWorking) {
      try {
        provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
          staticNetwork: true,
          batchMaxCount: 1
        });

        lastRpcUrl = rpcUrl;
        providerInitialized = true;

        console.log(`✅ RPC подключен успешно: ${rpcUrl.substring(0, 40)}...`);
        return;
      } catch (error) {
        console.warn(`⚠️ Ошибка создания провайдера для ${rpcUrl}:`, error instanceof Error ? error.message : 'unknown');
        provider = null;
      }
    }
  }

  // Если все RPC недоступны, используем fallback с отключенной проверкой сети
  const fallbackRpc = isTestnet ? DEFAULT_RPCS.testnet[0] : DEFAULT_RPCS.mainnet[0];
  console.warn(`⚠️ Все RPC недоступны, используется fallback без проверки: ${fallbackRpc}`);

  provider = new ethers.JsonRpcProvider(fallbackRpc, undefined, {
    staticNetwork: true,
    batchMaxCount: 1
  });

  lastRpcUrl = fallbackRpc;
  providerInitialized = true;
}

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    throw new Error('Provider not initialized. Call initializeProvider() first.');
  }

  return provider;
}

export function resetProvider(): void {
  provider = null;
  providerInitialized = false;
  lastRpcUrl = '';
}