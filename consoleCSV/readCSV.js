const fs = require('fs');
const csv = require('csv-parser');
const readline = require('readline');

// const filePath = './customers-2000000.csv'; 
// const memoryUsage = process.memoryUsage().heapUsed / (1024 * 1024);
const memoryUsage = process.memoryUsage();

const read = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const insights = {
  totalRow: 0,
  countries: {},
  cities: {},
  duplicatedName: new Set(),
  companies: new Set(),
  phone:{
    phone1: {
      useExtension: 0,
      noExtension: 0
    },
    phone2: {
      useExtension: 0,
      noExtension: 0
    }
  },
  earliestSubscription: null,
  latestSubscription: null,
  monthlySubscribtion: {},
  webProtocols: []
};

const seenName = new Set();
function countInsight(record){
  try{
    insights.totalRow++;
    if (record.country) {
      insights.countries[record.country] = (insights.countries[record.country] || 0) + 1;
    }

    if(record.firstName){
      if(seenName.has(record.firstName)){
        insights.duplicatedName.add(record.firstName);
      }else{
        seenName.add(record.firstName)
      }
    }

    if(record.city){
      insights.cities[record.city] = (insights.cities[record.city] || 0) + 1;
    }

    if (record.company) {
      insights.companies.add(record.company);
    }

    if(record.phone1){
      if(record.phone1.includes('x')) insights.phone.phone1.useExtension++;
      else insights.phone.phone1.noExtension++;
    }

    if(record.phone2){
      if(record.phone2.includes('x')) insights.phone.phone2.useExtension++;
      else insights.phone.phone2.noExtension++;
    }

    if (!isNaN(record.subscriptionDate.getTime())) {
      if (!insights.earliestSubscription || record.subscriptionDate < insights.earliestSubscription) {
        insights.earliestSubscription = record.subscriptionDate;
      }
      if (!insights.latestSubscription || record.subscriptionDate > insights.latestSubscription) {
        insights.latestSubscription = record.subscriptionDate;
      }
      const key = `${record.subscriptionDate.getFullYear()}-${String(record.subscriptionDate.getMonth() + 1).padStart(2, '0')}`;
      insights.monthlySubscribtion[key] = (insights.monthlySubscribtion[key] || 0) + 1;
    }

    if(record.website){
      const protocol = record.website.split('://')[0];
      insights.webProtocols[protocol] = (insights.webProtocols[protocol] || 0) + 1;
    }
  }catch(err){
    console.log(err);
  }

}

function getInsight(){
  const topCountries = Object.entries(insights.countries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('--- DATA INSIGHTS ---');
  console.log(`Total Rows:      ${insights.totalRow}`);
  console.log(`Total duplicated names: ${insights.duplicatedName.size}`);
  console.log(`Total Countries: ${Object.keys(insights.countries).length}`);
  console.log(`Total Cities:    ${Object.keys(insights.cities).length}`);
  console.log(`Date Range:      ${insights.earliestSubscription?.toLocaleDateString()} - ${insights.latestSubscription?.toLocaleDateString()}`);
  console.log('\nPhone Extension Usage:')
  console.table(insights.phone);

  console.log('\nMonthly Subscription:');
  const sortedMonthlySubscribtion = Object.entries(insights.monthlySubscribtion).sort((b, a) => new Date(a[1]) - new Date(b[1]));
  sortedMonthlySubscribtion.forEach(([key, value]) => {
    console.log(` - ${key}: ${value}`);
  });
  console.log('\nTop 5 Countries:');
  topCountries.forEach(([country, count]) => {
    console.log(` - ${country}: ${count}`);
  });
  console.log('\nWebsite Protocol usage:');
  Object.entries(insights.webProtocols).forEach(([protocolName, jumlah]) => {
    console.log(` - ${protocolName}: ${jumlah}`);
  })

}

// read manual
async function ReadSmallFile(filePath){
  const file = fs.readFileSync(filePath, 'utf-8');

  const lines = file.split(/\r?\n/).filter(line => line.trim() !== '');

  // const headers = lines[0].split(',').map(h => h.trim());

  lines.slice(1).forEach(line => {
    const data = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const record = {
      firstName: data[2],
      company: data[4],
      city: data[5],
      country: data[6],
      phone1: data[7],
      phone2: data[8],
      subscriptionDate: new Date(data[10]),
      website: data[11],
    }
    countInsight(record);

  })
  console.log('small File done\n');
  getInsight();
  const usageProcess = process.memoryUsage();
  console.log('Total allocaated (byte):', `${usageProcess.rss / (1024 * 1024)} MB`);
  console.log('Memory Usage RAM (byte):', `${usageProcess.heapUsed / (1024 * 1024)} MB`);
}

// read stream
async function ReadLargeFile(filePath){
  fs.createReadStream(filePath).pipe(csv())
  .on('data', (data) => {
    const record = {
      firstName: data['First Name'],
      company: data['Company'],
      city: data['City'],
      country: data['Country'],
      phone1: data['Phone 1'],
      phone2: data['Phone 2'],
      subscriptionDate: new Date(data['Subscription Date']),
      website: data['Website'],
    }
    countInsight(record);
  })
  .on('end', () => {
    getInsight();
    const usageProcess = process.memoryUsage();
    console.log('Total allocaated (byte):', `${usageProcess.rss / (1024 * 1024)} MB`);
    console.log('Memory Usage RAM (byte):', `${usageProcess.heapUsed / (1024 * 1024)} MB`);
  }).on('error', (err) => {
    console.error('Error processing the CSV:', err.message);
  })
}

read.question('Please input the csv file path: ', (answer) => {
  fs.stat(answer, async (err, stats) => {
    if(err) {
      console.error('Error reading file:', err.message);
      return;
    }
    stats.size / (1024 * 1024) > 20 ? await ReadLargeFile(answer) : await ReadSmallFile(answer);

  });
  console.log('Memory allocaated before:', `${memoryUsage.rss / (1024 * 1024)} MB`);
  console.log('Memory Usage before:', `${memoryUsage.heapUsed / (1024 * 1024)} MB`);
  read.close();

})
