package main

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
)

func InitLocalDB(version string) {

	var sqlstr string
	filename := "./local.v" + version + ".s3db"

	CopyFile(filename, "./empty.s3db")
	db, err := sql.Open("sqlite3", filename)
	defer db.Close()

	switch version {
	case "0.1":
		sqlstr = "create table `com` (`name` VARCHAR(128) NULL,`puburl` text NULL,`creatortype` integer NULL,`creatorname` VARCHAR(128) NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `cod` (`name` VARCHAR(128) NULL,`modelname` VARCHAR(256),`puburl` text NULL,`deployertype` integer NULL,`deployername` VARCHAR(128) NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `assettype` (`name` VARCHAR(128) NULL,`define` text NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `assetpooltype` (`name` VARCHAR(128) NULL,`define` text NULL,`creatortype` integer NULL,`creatorname` VARCHAR(128) NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `assetprice` (`pooltype` VARCHAR(128) NULL,`assettype` VARCHAR(128) NULL,`price` real NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `exchange` (`poolname1` VARCHAR(128) NULL,`assettype1` VARCHAR(128) NULL,`amount1` real NULL,`poolname2` VARCHAR(128) NULL,`assettype2` VARCHAR(128) NULL,`amount2` real NULL,`tokenamount` real NULL,`exchangetime` text NULL,`publog` text NULL,`locallog` text NULL,`param1` text NULL,`param2` text NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `contract` (`contractid` INTEGER PRIMARY KEY AUTOINCREMENT,`poolname` VARCHAR(128) NULL,`otherpartytype` INTEGER NULL,`otherpartyname` VARCHAR(128) NULL,`pubcontent` text NULL,`localcontent` text NULL,`signtime` text NULL,`validtime` text NULL,`invalidtime` text NULL,`status` INTEGER NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `ticket` (`ticketid` INTEGER PRIMARY KEY AUTOINCREMENT,`contractid` INTEGER,`pubcontent` text NULL,`localcontent` text NULL,`createtime` text NULL,`status` INTEGER NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `pay` (`payid` INTEGER PRIMARY KEY AUTOINCREMENT,`contractid` INTEGER NULL,`ticketID` INTEGER NULL,`poolname` VARCHAR(128) NULL,`assettype` VARCHAR(128) NULL,`amount` real NULL,`tokenamount` real NULL,`paytime` text NULL,`publog` text NULL,`locallog` text NULL,`param1` text NULL,`param2` text NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `income` (`incomeid` INTEGER PRIMARY KEY AUTOINCREMENT,`contractid` INTEGER NULL,`ticketID` INTEGER NULL,`poolname` VARCHAR(128) NULL,`assettype` VARCHAR(128) NULL,`amount` real NULL,`tokenamount` real NULL,`incometime` text NULL,`publog` text NULL,`locallog` text NULL,`param1` text NULL,`param2` text NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)
	}

}

func LocalSave(datatype int, date string) {

}
