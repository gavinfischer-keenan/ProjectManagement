async function run() {
    try {
        const health = await fetch('http://localhost:3010/api/health').then(r => r.json());
        console.log('Health check:', health);

        const tasks = await fetch('http://localhost:3010/api/tasks').then(r => r.json());
        console.log('Tasks count:', tasks.tasks ? tasks.tasks.length : tasks);

        const vendors = await fetch('http://localhost:3010/api/vendors').then(r => r.json());
        console.log('Vendors count:', vendors.vendors ? vendors.vendors.length : vendors);

        // Test CRUD
        const newAssetRes = await fetch('http://localhost:3010/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test AC Unit', category: 'HVAC' })
        });
        const newAsset = await newAssetRes.json();
        console.log('Created asset:', newAsset);

        const delAssetRes = await fetch('http://localhost:3010/api/assets/' + newAsset.id, { method: 'DELETE' });
        console.log('Deleted asset status:', delAssetRes.status);
    } catch (e) {
        console.error('Test failed:', e);
    }
}
run();
