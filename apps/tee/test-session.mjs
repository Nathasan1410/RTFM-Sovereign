const response = await fetch('http://localhost:3001/session/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userAddress: '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48',
    goldenPath: {
      theory: 'React Development',
      topic: 'React Development',
      objectives: [],
      prerequisites: [],
      milestones: [
        { id: 1, title: 'M1', description: '' },
        { id: 2, title: 'M2', description: '' },
        { id: 3, title: 'M3', description: '' },
        { id: 4, title: 'M4', description: '' },
        { id: 5, title: 'M5', description: '' }
      ]
    }
  })
});

const result = await response.json();
console.log(JSON.stringify(result, null, 2));
