package main

type TimeLogItem struct {
	BeginTime string
	EndTime   string
	Minute    int
	Title     string
	Level     int
	COD       string
	Log       string
}

type EgoClient struct {
	Owner               Person
	CommunityDeployment COD
	PoolList            []AssetPool
}

type AssetPool struct {
	PoolTypeName string
	Price        map[string]float32
}

type AssetPoolType struct {
	Name        string
	Define      string
	CreatorType int
	CreatorName string
}

type AssetType struct {
	Name   string
	Define string
}

type COM struct {
	Name        string
	PubURL      string
	CreatorType int
	CreatorName string
}

//COD 是一个利益共同体部署。
//部署方案作为一种信息资产，叫CODFile。
type COD struct {
	Name         string
	Model        COM
	PubURL       string
	DeployerType int
	DeployerName string
}

type Person struct {
	Name     string
	NickName string
	Email    string
}

const (
	Naturalperson = 1 << iota // 1 (i.e. 1 << 0)
	VirtualPerson             // 2 (i.e. 1 << 1)
)
