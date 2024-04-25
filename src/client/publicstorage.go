package main

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
)

func InitPubDB(version string) {

	var sqlstr string
	filename := "./pub.v" + version + ".s3db"
	switch version {
	case "0.1":
		sqlstr = "create table `com` (`name` VARCHAR(128) NULL,`puburl` VARCHAR(128) NULL,`creatortype` integer NULL,`creatorname` VARCHAR(128) NULL);"
	}

	db, err := sql.Open("sqlite3", filename)
	defer db.Close()
	_, err = db.Exec(sqlstr)
	checkErr(err)
}

func PubSave(datatype int, date string) {

}
