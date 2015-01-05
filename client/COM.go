package main

import (
	"fmt"
	"html/template"
	//"log"
	"net/http"
	"strings"
)

func COMList(w http.ResponseWriter, r *http.Request) {
	r.ParseForm() //解析参数，默认是不会解析的
	fmt.Println("method", r.Method)
	fmt.Println("path", r.URL.Path)

	for k, v := range r.Form {
		fmt.Println("key:", k)
		fmt.Println("val:", strings.Join(v, ""))
	}

	t, _ := template.ParseFiles("static/template/welcome.gtpl")
	t.Execute(w, nil)
}

func COMDetail(w http.ResponseWriter, r *http.Request) {
	r.ParseForm() //解析参数，默认是不会解析的
	fmt.Println("method", r.Method)
	fmt.Println("path", r.URL.Path)

	for k, v := range r.Form {
		fmt.Println("key:", k)
		fmt.Println("val:", strings.Join(v, ""))
	}

	t, _ := template.ParseFiles("static/template/welcome.gtpl")
	t.Execute(w, nil)
}

func NewCOM(w http.ResponseWriter, r *http.Request) {
	r.ParseForm() //解析参数，默认是不会解析的
	fmt.Println("method", r.Method)
	fmt.Println("path", r.URL.Path)

	for k, v := range r.Form {
		fmt.Println("key:", k)
		fmt.Println("val:", strings.Join(v, ""))
	}

	t, _ := template.ParseFiles("static/template/welcome.gtpl")
	t.Execute(w, nil)
}
