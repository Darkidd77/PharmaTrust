package chaincode

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing an Asset
type SmartContract struct {
	contractapi.Contract
}

// MedsData describes basic details of what makes up a medicine data asset
type MedsData struct {
	UniqueKey           string  `json:"uniqueKey"`
	BatchNo             string  `json:"batchNo"`
	WarehouseNo         string  `json:"warehouseNo"`
	IotId               string  `json:"iotId"`
	TemperatureSensorId string  `json:"temperatureSensorId"`
	HumiditySensorId    string  `json:"humiditySensorId"`
	Timestamp           string  `json:"timestamp"`
	Temperature         float64 `json:"temperature"`
	Humidity            float64 `json:"humidity"`
}

// CreateMedsData issues a new asset to the world state with given details.
func (s *SmartContract) CreateMedsData(ctx contractapi.TransactionContextInterface, batchNo string, warehouseNo string, iotId string, temperatureSensorId string, humiditySensorId string, timestamp string, temperature float64, humidity float64) error {
	uniqueKey := fmt.Sprintf("%s_%s", batchNo, timestamp)

	exists, err := s.AssetExists(ctx, uniqueKey)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the asset %s already exists", uniqueKey)
	}

	data := MedsData{
		UniqueKey:           uniqueKey,
		BatchNo:             batchNo,
		WarehouseNo:         warehouseNo,
		IotId:               iotId,
		TemperatureSensorId: temperatureSensorId,
		HumiditySensorId:    humiditySensorId,
		Timestamp:           timestamp,
		Temperature:         temperature,
		Humidity:            humidity,
	}
	dataJSON, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(uniqueKey, dataJSON)
}

// GetAllMedsData returns all assets found in world state
func (s *SmartContract) GetAllMedsData(ctx contractapi.TransactionContextInterface) ([]*MedsData, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var allMedsData []*MedsData
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var medsData MedsData
		err = json.Unmarshal(queryResponse.Value, &medsData)
		if err != nil {
			return nil, err
		}
		allMedsData = append(allMedsData, &medsData)
	}

	return allMedsData, nil
}

// AssetExists returns true when asset with given ID exists in world state
func (s *SmartContract) AssetExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return assetJSON != nil, nil
}
