FROM postman/newman:4
LABEL maintainer="Pierre El-khoury <pierre.el-khoury@ruter.no>"

WORKDIR /TestAutomation
COPY . .
WORKDIR /TestAutomation/NewmanZapiProj
RUN npm install npm
RUN npm install express
RUN npm install newman-reporter-junitfull
RUN npm install selenium-webdriver

VOLUME [ "/TestAutomation/reports" ]
ENTRYPOINT [ ]
#CMD ["/bin/bash"]
CMD [ "node","newmanZapi", "-f", "newman-json-result.json", "-e", "SystemTest", "-o", "10000projctID"]
