const db = require("./index");
const cleanExpensiveData = require("./updates/01-cleanExpensiveData");

async function getControl() {
  const control = await db.models.control.findOne({});
  if (control) return control;
  return await db.models.control.create({ version: 0 });
}

async function updateControlVersion(version) {
  const control = await getControl();
  control.version = version;
  await control.save();
}

const CURRENT_VERSION = 1;

async function executeUpdates(version) {
  switch (version) {
    case 0:
      const label = `[${version}/${CURRENT_VERSION}]:`;
      const timeLabel = `${label} Update time`;

      console.log(`${label} Executing update`);
      console.time(timeLabel);
      await cleanExpensiveData();
      console.timeEnd(timeLabel);

      version += 1;
      break;
    default:
      // All up to date
      break;
  }
  return version;
}

async function manageDatabaseUpdates() {
  await db.connect();

  const control = await getControl();

  const initialVersion = control.version;
  const newVersion = await executeUpdates(initialVersion);

  if (initialVersion !== newVersion) {
    await updateControlVersion(newVersion);
  }

  await db.disconnect();
}

module.exports = manageDatabaseUpdates;
