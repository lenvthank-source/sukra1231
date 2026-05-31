const details1 = { dob: "1990-05-10", tob: "14:30", lat: 18.975, lon: 72.825, timezone: 5.5, place: "Mumbai" };
const details2 = { dob: "2000-01-01", tob: "08:00", lat: 40.7128, lon: -74.006, timezone: -5.0, place: "New York" };

async function run() {
  const resp1 = await fetch("http://localhost:3000/api/astrology/calculate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details1)
  });
  console.log(await resp1.json());

  const resp2 = await fetch("http://localhost:3000/api/astrology/calculate", {
     method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details2)
  });
  console.log(await resp2.json());
}
run();
