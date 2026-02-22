const rpc = 'https://eth-sepolia.g.alchemy.com/v2/aZ3qoFHQnM6GjHHDgvQVt';
const address = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';

console.log(`Checking balance for ${address}...`);

fetch(rpc, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({jsonrpc:'2.0', method:'eth_getBalance', params:[address, 'latest'], id:1})
}).then(r=>r.json())
  .then(d => {
    if(d.error) {
        console.error('Error:', d.error);
    } else {
        const wei = parseInt(d.result, 16);
        const eth = wei / 1e18;
        console.log(`Balance: ${eth} ETH`);
    }
  })
  .catch(e => console.error('Fetch error:', e));
