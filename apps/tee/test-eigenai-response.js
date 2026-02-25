const axios = require('axios');
const { privateKeyToAccount } = require('viem/accounts');

const privateKey = '0x14f2045df205ff5ea676c1b8d0c1af01d193b455ea0201658fbf1ca5fc0eb2a0';
const account = privateKeyToAccount(privateKey);

(async () => {
  try {
    const grantMsg = (await axios.get('https://determinal-api.eigenarcade.com/message?address=' + account.address)).data.message;
    const sig = await account.signMessage({message: grantMsg});
    
    const prompt = `Generate a rigorous learning roadmap for "Rust Ownership" with exactly 7 modules. Structure: { "title": "Project Title", "modules": [ { "order": 1, "title": "Step Title", "context": "Explanation", "docs": [{ "title": "MDN Reference", "url": "https://developer.mozilla.org/..." }], "challenge": "Specific instruction", "verificationCriteria": ["Check for div"], "groundTruth": "<div>...</div>", "starterCode": "<!-- code -->" } ] }. Output valid JSON only.`;
    
    const resp = await axios.post('https://determinal-api.eigenarcade.com/api/chat/completions', {
      messages: [
        {role:'system', content:'You are a JSON generator. Output ONLY valid JSON, no extra text.'},
        {role:'user', content:prompt}
      ],
      model: 'gpt-oss-120b-f16',
      max_tokens: 2000,
      grantMessage: grantMsg,
      grantSignature: sig,
      walletAddress: account.address
    }, {
      headers: {'Content-Type':'application/json'},
      timeout: 60000
    });
    
    console.log('=== EigenAI Response ===');
    console.log(resp.data.choices[0].message.content);
    console.log('=== End Response ===');
  } catch (e) {
    console.error('Error:', e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
  }
})();
