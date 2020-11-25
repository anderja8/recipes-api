# Usage
The purpose of this app is to demonstrate use of authentication within a typical CRD api, with this app being the client and Google being the auth server.
This app will redirect the user to Google, where they can login with a google account and get a JWT. With this JWT, they can create boats, view their private
boats, and delete their boats. More information is on the homepage of the app itself.
[here](https://developers.google.com/identity/protocols/OAuth2WebServer).\
\
You will then need to create a config.json file with the following format:
```
{
	"CLIENT_ID": <your app's client id>,
	"CLIENT_SECRET": <your app's client secret>,
	"PROJECT_ID": <your app's project id>,
	"GCLOUD_PROJECT": <your app's gcloud project name, should be the same as project id>,
	"DATA_BACKEND": "datastore"
}
```

# Running locally
Change the ROOT_URL constant in auth.js to `http:localhost:8080` and ensure that redirection to localhost is configured in your Google auth provider account. Then start up
the gcloud datastore emulator with `gcloud beta emulators datastore start --no-store-on-disk`. Then, in a seperate terminal, run `$(gcloud beta emulators datastore env-init)`, followed by `npm start server.js`

# Deploying to Google App Engine
Simply run `gcloud app deploy --project <your GAE project ID>` to deploy this app to the google app engine. Alternatively, you can set the default project with `gcloud config set project <your GAE project ID>` and then run `gcloud app deploy`. Run `gcloud app browse` to open the app in your browser.

# Gotchas
If you are testing locally, you will need to clear your cookies to avoid internal server errors when you are ready to test on the cloud. The same goes for redeployment.