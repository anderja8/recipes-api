const {Datastore} = require('@google-cloud/datastore');
const config = require('../config.js')
const projectId = config.GCLOUD_PROJECT;
const datastore = new Datastore({projectId:projectId});

class GCloudDatastore {
    constructor() {
        this.datastore = datastore;
    }

    //Adds the datastore id to the passed object and then returns the updated object
    fromDatastore(item) {
        console
        item.id = item[Datastore.KEY].id;
        return item;
    }

    //Saves the supplied document to the datastore with the supplied key
    async saveDoc(document, datastoreKey) {
        const key = this.datastore.key(datastoreKey);

        try {
            await this.datastore.save({"key":key, "data":document});
        } catch (err) {
            return err;
        }

        document.id = key.id;
        return document;
    }

    //Searches the datastore with the given key for the given id, returns false
    //if no document is found, returns the document othewise.
    async getDoc(id, datastoreKey) {
        const key = this.datastore.key([datastoreKey, parseInt(id, 10)]);

        let doc;
        try {
            doc = await this.datastore.get(key);
        } catch (err) {
            return err;
        }

        if (doc[0] == undefined) {
            return false;
        }
        if (doc.length > 1) {
            console.log('Warning: more than one doc found by GCloudDatastore.getDoc');
        }
        return this.fromDatastore(doc[0]);
    }

    //Pulls all documents in the datastore for the given key
    async getDocs(datastoreKey) {
        const q = this.datastore.createQuery(datastoreKey);

        let entities;
        try {
            entities = await this.datastore.runQuery(q);
        } catch (err) {
            return err;
        }

        return entities[0].map(this.fromDatastore);
    }

    //Pulls all documents in the datastore for the given key. Uses pagination in combination with a max result size
    async getDocsWithPagination(datastoreKey, pageSize, pageCursor) {
        let q = this.datastore.createQuery(datastoreKey).limit(pageSize);

        if (pageCursor) {
            q = q.start(pageCursor);
        }

        let results;
        try {
            results = await datastore.runQuery(q);
        } catch (err) {
            return err;
        }
        const entities = results[0].map(this.fromDatastore);
        const info = results[1];
    
        //There is glitch the datastore emulator where moreResults will never return
        //NO_MORE_RESULTS. Adding a length check as a pseudo-work around for local testing
        //https://github.com/googleapis/google-cloud-node/issues/2846
        if (info.moreResults === Datastore.NO_MORE_RESULTS || entities.length < pageSize) {
            //Make this resposne independent of datastore implementation
            info.moreResults = false;
        }
        else {
            info.moreResults = true;
        }
    
        return [entities, info];
    }

    //Tries to replace a doc with the given id from the datastore with the given key
    //Returns false if the docID is not in the datastore, or the doc if otherwise
    async replaceDoc(docID, newDoc, datastoreKey) {
        //Check that the doc exists
        let doc;
        try {
            doc = await this.getDoc(docID, datastoreKey);
        } catch (err) {
            return err;
        }
        if (doc === false) {
            return false;
        }

        const key = this.datastore.key([datastoreKey, parseInt(docID, 10)]);
        try {
            await this.datastore.save({"key":key, "data":newDoc});
        } catch (err) {
            return err;
        }

        newDoc.id = docID;
        return newDoc;
    }

    //Tries to delete a document with the given id from datastore with the given key
    //Returns the key if successful, false if the doc could not be found.
    async deleteDoc(id, datastoreKey) {
        let doc;
        try {
            doc = await this.getDoc(id, datastoreKey);
        } catch (err) {
            return err;
        }

        if (doc === false) {
            return false;
        }
        const key = this.datastore.key([datastoreKey, parseInt(id, 10)]);
        return this.datastore.delete(key);
    }

    //Pulls all documents from the datastore with given key that have an attribute
    //That evaluates to true when the comparator is applied to the attributeValue
    async getDocsWithAttribute(datastoreKey, attribute, comparator, attributeValue) {
        const q = this.datastore.createQuery(datastoreKey).filter(attribute, comparator, attributeValue);

        let entities;
        try {
            entities = await this.datastore.runQuery(q);
        } catch (err) {
            return err;
        }

        return entities[0].map(this.fromDatastore);
    }
}

module.exports = { GCloudDatastore };