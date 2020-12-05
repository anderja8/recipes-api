# Link
At least for now, you can view this app running on Google's
app engine at https://anderja8-recipes-api.appspot.com

# Usage
The purpose of this app is to demonstrate a fully functional google cloud engine CRUD app. This app does this by forming as an API where users can store
recipes and ingredients, and browse other user's recipes. Full documentation of functionality can be found at the root url and in the documentation pdf.
Using this API requires a google account. You can review how your data will be used at the /privacy endpoint.
\
To run this app, you will then need to create a config.json file with the following format:
```
{
	"CLIENT_ID": <your app's client id>,
	"CLIENT_SECRET": <your app's client secret>,
	"PROJECT_ID": <your app's project id>,
	"GCLOUD_PROJECT": <your app's gcloud project name, should be the same as project id>,
	"DATA_BACKEND": "datastore"
	"ROOT_URL": "Either "http://localhost:8080" or your google cloud app's url
}
```

# Running locally
Ensure the ROOT_URL constant in config.json is set to `http:localhost:8080` and that redirection to localhost is configured in your Google auth provider account. Then start up the gcloud datastore emulator with `gcloud beta emulators datastore start --no-store-on-disk`. Then, in a seperate terminal, run `$(gcloud beta emulators datastore env-init)`, followed by `npm start`

# Deploying to Google App Engine
Simply run `gcloud app deploy --project <your GAE project ID>` to deploy this app to the google app engine. Alternatively, you can set the default project with `gcloud config set project <your GAE project ID>` and then run `gcloud app deploy`. Run `gcloud app browse` to open the app in your browser.

# Gotchas
If you are testing locally, you will need to clear your cookies to avoid internal server errors when you are ready to test on the cloud. The same goes for redeployment.