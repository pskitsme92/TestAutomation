#Windows Batch Command in Jenkins

 echo "You are in the powershell script now..."
 $SourceFilePath = $env:WORKSPACE
 $FilenamePostfix = "*.postman_collection.json"
 $EnvironmentFile = "Demo-OpenWeatherMap.postman_environment.json"

 # Get all Postman test files
 $JsonFiles = Get-ChildItem -Path $SourceFilePath -name -Filter $FilenamePostfix | Sort-Object -Property CreationTime -Descending

 # Change to directory where we have NodeJs installed. Otherwise, the 'newman' command will not be recognized. 
 # You can install NPM and Newman as a user and copy the files from C:\Users\[username]\AppData\npm into C:\ drive.
 #cd You can find the NPM packages here: C:\Users\[username]\AppData\Roaming\npm\node_modules\newman\bin
 cd C:\npm\node_modules\newman\bin

 # Loop through the json files and execute newman to run the Postman tests
 foreach ($File in $JsonFiles) {
	 $collectionfilepath = "$SourceFilePath\$File"
	 $environmentfilepath = "$SourceFilePath\$EnvironmentFile"
	 node newman run $collectionfilepath -e $environmentfilepath --disable-unicode 

 if($LASTEXITCODE -eq 1) {
		 echo "Integration error found!"
		 exit 1
	 }
 }

 exit $LASTEXITCODE
 
 docker run -v C:/PSK_SW/Ruter/sb-apita-api/ContinuousTesting:/etc/newman -t postman/newman run \"Sprinttest/SprintTesting.postman_collection.json\"     --c=\"EnvironmentFiles/APITA.TEST.postman_environment.json\" --reporter-html-export=newman-results.html\""