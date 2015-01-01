package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

type LevelBrief struct {
	Level int
	Token float64
	Time  float64
	RMB   float64
}

type LevelListData struct {
	Levels []LevelBrief
}

func welcome(w http.ResponseWriter, r *http.Request) {
	r.ParseForm() //解析参数，默认是不会解析的
	fmt.Println("method", r.Method)
	fmt.Println("path", r.URL.Path)

	for k, v := range r.Form {
		fmt.Println("key:", k)
		fmt.Println("val:", strings.Join(v, ""))
	}

	var lld LevelListData
	var lbarray [10]LevelBrief
	lld.Levels = lbarray[0:0]

	var lb LevelBrief
	lb = LevelBrief{0, 24, 0, 0}
	lld.Levels = append(lld.Levels, lb)

	lb = LevelBrief{1, 0, 0, 0}
	lld.Levels = append(lld.Levels, lb)

	lb = LevelBrief{2, 0, 0, 0}
	lld.Levels = append(lld.Levels, lb)

	log.Println(lld)

	t, _ := template.ParseFiles("static/template/welcome.gtpl")
	t.Execute(w, lld)
}

func GithubPush(w http.ResponseWriter, r *http.Request) {
	r.ParseForm() //解析参数，默认是不会解析的
	log.Printf("r:", r)
	log.Printf("r:", r.Form)
	fmt.Println("method", r.Method)
	fmt.Println("path", r.URL.Path)

	for k, v := range r.Form {
		fmt.Println("key:", k)
		fmt.Println("val:", strings.Join(v, ""))
	}

}

func serveFile(pattern string, filename string) {
	http.HandleFunc(pattern, func(w http.ResponseWriter, req *http.Request) {
		http.ServeFile(w, req, filename)
	})
}

func main() {
	//设置访问的路由
	// web pages
	http.HandleFunc("/", welcome)

	http.HandleFunc("/githubhook/push", GithubPush)
	//http.HandleFunc("/githubhook/commit", GithubCommit)

	// static files
	http.HandleFunc("/static/", func(w http.ResponseWriter, req *http.Request) {
		http.ServeFile(w, req, req.URL.Path[1:])
	})
	serveFile("/favicon.ico", "./favicon.ico")

	err := http.ListenAndServe(":80", nil) //设置监听的端口
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}

}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}
