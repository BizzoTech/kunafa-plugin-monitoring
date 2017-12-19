const express = require('express');
const server = express();
const fetch = require('node-fetch');

const client = require('prom-client');

const {mainDb, publicDb, archiveDb, eventsDb, notificationsDb, sharedDb, authDb, anonymousDb} = require('experimental-server');


const activeConnectionsCount = new client.Gauge({
  name: 'kunafa_active_connections_count',
  help: 'Couter of Active Connections to the server'
});

const dbDocsCount = new client.Gauge({
  name: 'kunafa_db_docs_count',
  help: 'Couter of database documents',
  labelNames: ['Database']
});


const publicDocsCount = new client.Gauge({
  name: 'kunafa_public_docs_count',
  help: 'Couter of public documents',
  labelNames: ['Type']
});

const mainDocsCount = new client.Gauge({
  name: 'kunafa_main_docs_count',
  help: 'Couter of main documents',
  labelNames: ['Type', 'Status', 'ActionType']
});

const eventsDocsCount = new client.Gauge({
  name: 'kunafa_events_docs_count',
  help: 'Couter of events documents',
  labelNames: ['Status', 'ActionType']
});

const archiveDocsCount = new client.Gauge({
  name: 'kunafa_archive_docs_count',
  help: 'Couter of archive documents',
  labelNames: ['Type', 'Status', 'ActionType']
});

const anonymousDocsCount = new client.Gauge({
  name: 'kunafa_anonymous_docs_count',
  help: 'Couter of anonymous documents',
  labelNames: ['Type', 'Status', 'ActionType']
});

setInterval(async() => {
  try {

    const basicStatus = await fetch('http://proxy-server:8090/basic_status');
    const basicStatusText = await basicStatus.text();

    const activeConnections = Number(basicStatusText.split('\n')[0].split(': ')[1]);

    activeConnectionsCount.set(activeConnections);

    const mainDbInfo = await mainDb.info();
    dbDocsCount.labels('main').set(mainDbInfo.doc_count);

    const publicDbInfo = await publicDb.info();
    dbDocsCount.labels('public').set(publicDbInfo.doc_count);

    const archiveDbInfo = await archiveDb.info();
    dbDocsCount.labels('archive').set(archiveDbInfo.doc_count);

    const eventsDbInfo = await eventsDb.info();
    dbDocsCount.labels('events').set(eventsDbInfo.doc_count);

    const notificationsDbInfo = await notificationsDb.info();
    dbDocsCount.labels('notifications').set(notificationsDbInfo.doc_count);

    const sharedDbInfo = await sharedDb.info();
    dbDocsCount.labels('shared').set(sharedDbInfo.doc_count);

    const authDbInfo = await authDb.info();
    dbDocsCount.labels('auth').set(authDbInfo.doc_count);

    const anonymousDbInfo = await anonymousDb.info();
    dbDocsCount.labels('anonymous').set(anonymousDbInfo.doc_count);


    const publicDocs = await publicDb.find({
      selector: {
        type: {
          $exists: true
        }
      },
      limit: 1000000,
      fields: ['_id', 'type']
    });

    publicDocsCount.reset();
    if(publicDocs.docs.length > 0){
      publicDocs.docs.forEach(doc => {
        publicDocsCount.labels(doc.type).inc();
      });
    } else {
      publicDocsCount.labels('None').set(0);
    }
    


    const mainDocs = await mainDb.find({
      selector: {
        type: {
          $exists: true
        }
      },
      limit: 1000000,
      fields: ['_id', 'type', 'status', 'action']
    });

    mainDocsCount.reset();
    if(mainDocs.docs.length > 0){
      mainDocs.docs.forEach(doc => {
        mainDocsCount.labels(doc.type, doc.status, doc.action ? doc.action.type : 'None').inc();
      });
    } else {
      mainDocsCount.labels('None', 'None', 'None').set(0);
    }
    

    const eventsDocs = await eventsDb.find({
      selector: {
        type: {
          $exists: true
        }
      },
      limit: 1000000,
      fields: ['_id', 'status', 'action']
    });
  
    if(eventsDocs.docs.length > 0){
      eventsDocsCount.reset();
      eventsDocs.docs.forEach(doc => {
        eventsDocsCount.labels(doc.status, doc.action ? doc.action.type : 'None').inc();
       });
    } else {
      eventsDocsCount.labels('None', 'None').set(0);
    }
   

    const archiveDocs = await archiveDb.find({
      selector: {
        type: {
          $exists: true
        }
      },
      limit: 1000000,
      fields: ['_id', 'type', 'status', 'action']
    });

    archiveDocsCount.reset();
    archiveDocs.docs.forEach(doc => {
      archiveDocsCount.labels(doc.type, doc.status, doc.action ? doc.action.type : 'None').inc();
    });

    const anonymousDocs = await anonymousDb.find({
      selector: {
        type: {
          $exists: true
        }
      },
      limit: 1000000,
      fields: ['_id', 'type', 'status', 'action']
    });

    anonymousDocsCount.reset();
    anonymousDocs.docs.forEach(doc => {
      anonymousDocsCount.labels(doc.type, doc.status, doc.action ? doc.action.type : 'None').inc();
    });

  } catch (error) {
    console.log(error);
  }
  
}, 5000);


server.get('/metrics', (req, res) => {
	res.set('Content-Type', client.register.contentType);
	res.end(client.register.metrics());
});

console.log('Server listening to 3000, metrics exposed on /metrics endpoint');
server.listen(3000);