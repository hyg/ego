package main

import (
	"database/sql"
	"fmt"
	_ "github.com/mattn/go-sqlite3"
)

func InitLocalDB() {

	var sqlstr string
	filename := "v" + version + ".s3db"
	db, err := sql.Open("sqlite3", filename)
	defer db.Close()

	switch version {
	case "0.1":
		sqlstr = "create table `com` (`name` text NULL,`puburl` text NULL,`creatortype` integer NULL,`creatorname` text NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `cod` (`name` text NULL,`modelname` VARCHAR(256),`puburl` text NULL,`apiurl` text NULL,`deployertype` integer NULL,`deployername` text NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `assettype` (`name` text NULL,`define` text NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `assetpooltype` (`name` text NULL,`define` text NULL,`creatortype` integer NULL,`creatorname` text NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `assetprice` (`pooltype` text NULL,`assettype` text NULL,`price` real NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `exchange` (`poolname1` text NULL,`assettype1` text NULL,`amount1` real NULL,`poolname2` text NULL,`assettype2` text NULL,`amount2` real NULL,`tokenamount` real NULL,`exchangetime` text NULL,`publog` text NULL,`locallog` text NULL,`param1` text NULL,`param2` text NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `contract` (`contractid` INTEGER PRIMARY KEY AUTOINCREMENT,`poolname` text NULL,`otherpartytype` INTEGER NULL,`otherpartyname` text NULL,`content` text NULL,`signtime` text NULL,`validtime` text NULL,`invalidtime` text NULL,`status` INTEGER NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `ticket` (`ticketid` INTEGER PRIMARY KEY AUTOINCREMENT,`contractid` INTEGER,`target` text NULL,`content` text NULL,`createtime` text NULL,`deadline` text NULL,`status` INTEGER NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `ticketbudget` (`ticketbudgetid` INTEGER PRIMARY KEY AUTOINCREMENT,`contractid` INTEGER NULL,`ticketID` INTEGER NULL,`poolname` text NULL,`assettype` text NULL,`amount` real NULL,`tokenamount` real NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `pay` (`payid` INTEGER PRIMARY KEY AUTOINCREMENT,`contractid` INTEGER NULL,`ticketID` INTEGER NULL,`poolname` text NULL,`assettype` text NULL,`amount` real NULL,`tokenamount` real NULL,`paytime` text NULL,`log` text NULL,`param1` text NULL,`param2` text NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = "create table `income` (`incomeid` INTEGER PRIMARY KEY AUTOINCREMENT,`contractid` INTEGER NULL,`ticketID` INTEGER NULL,`poolname` text NULL,`assettype` text NULL,`amount` real NULL,`tokenamount` real NULL,`incometime` text NULL,`log` text NULL,`param1` text NULL,`param2` text NULL);"
		_, err = db.Exec(sqlstr)
		checkErr(err)

		sqlstr = fmt.Sprintf("insert into `contract` values (null,'raw',null,null,'living',null,datetime('now','localtime'),datetime('now','localtime'),null,%d);", Valid)
		_, err = db.Exec(sqlstr)
		checkErr(err)

		//sqlstr = "insert into `assettype` values ('Time',\"时间\"),('Token',\"个人领域模型内部记账单位\"),('RMB',\"人民币：中华人民共和国法定货币。\");"
		//_, err = db.Exec(sqlstr)
		stmt, err := db.Prepare("insert into `assettype` values (?,?)")
		checkErr(err)
		defer stmt.Close()

		res, err := stmt.Exec("Time1", "时间:每天8小时")
		checkErr(err)
		res, err := stmt.Exec("Time2", "时间:每天6小时")
		checkErr(err)
		res, err := stmt.Exec("Time3", "时间:每天10小时")
		checkErr(err)
		res, err = stmt.Exec("Token", "个人领域模型内部记账单位")
		checkErr(err)
		res, err = stmt.Exec("RMB", "人民币：中华人民共和国法定货币。")
		checkErr(err)

		affect, err := res.RowsAffected()
		checkErr(err)
		fmt.Println(affect)
	}

}

func LocalSave(datatype int, date string) {

}
