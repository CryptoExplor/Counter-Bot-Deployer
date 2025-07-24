// worker.js for Cloudflare Worker
// This worker acts as a proxy to Etherscan-compatible APIs for contract verification.

export default {
  async fetch(request) {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Parse the request body
    const { contractAddress, sourceCode, contractName, compilerVersion, optimizationUsed, runs, chainId, etherscanApiKey } = await request.json();

    // Basic validation
    if (!contractAddress || !sourceCode || !contractName || !compilerVersion || !chainId || !etherscanApiKey) {
      return new Response(JSON.stringify({ status: '0', message: 'Missing required parameters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Map chainId to Etherscan API URL
    const chainApiUrls = {
      8453: "https://api.basescan.org/api",       // Base Mainnet
      59144: "https://api.lineascan.build/api",   // Linea Mainnet
      534352: "https://api.scrollscan.com/api",   // Scroll Mainnet
      11155111: "https://api-sepolia.etherscan.io/api" // Sepolia Testnet
      // Add more chains as needed
    };

    const apiUrl = chainApiUrls[chainId];
    if (!apiUrl) {
      return new Response(JSON.stringify({ status: '0', message: `Unsupported Chain ID: ${chainId}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare form data for Etherscan API
    const formData = new URLSearchParams();
    formData.append('apikey', etherscanApiKey);
    formData.append('module', 'contract');
    formData.append('action', 'verifysourcecode');
    formData.append('contractaddress', contractAddress);
    formData.append('sourceCode', sourceCode);
    formData.append('contractname', contractName);
    formData.append('compilerversion', compilerVersion);
    formData.append('optimizationUsed', optimizationUsed.toString()); // Ensure it's a string
    formData.append('runs', runs.toString()); // Ensure it's a string
    formData.append('codeformat', 'Solidity Single File'); // Assuming single file for now
    formData.append('contractmode', 'solidity');
    formData.append('txhash', ''); // Not strictly needed for verification by address

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded' // Etherscan API expects this content type
        },
        body: formData.toString()
      });

      const result = await response.json();
      // Forward the Etherscan API response directly to the frontend
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error("Worker verification error:", error);
      return new Response(JSON.stringify({ status: '0', message: `Internal server error: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};
