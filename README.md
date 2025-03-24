Welcome to the back end of my Fitness App. Feel free to copy the repo and take a look. A few issues to keep in mind:

1. You will need to make your own MongoDB account if you don't have one and feed the connection string into a .env file in this repo
2. The email verification doesn't work currently because I don't want to pay for AWS's Simple emailing service(SES). To get around this, access the table that should be created in Mongo and set verified to true
3. You will also need to make your own .env file. This should be the connection string for Mongo, the JWT secret(a random string of numbers, letters, or symbols), the email password(if you made one for verification), and the email user(if you made an email)
4. Some other issues specific to the frontend will be listed in the readme there

Other than that, just CD into the main folder and run npm install to download all the dependencies 
Run npm start to startup the back end
