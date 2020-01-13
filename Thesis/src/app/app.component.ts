import { Component, Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import { reject } from 'q';
declare var $: any;
declare var vis: any;

// declare var queue: Array<string>;
let queue = [];
let node_id = [];
let alldata: IHash = {};
let mapping: IHash = {};
let stop = true;

// search service to get 
@Injectable()
export class SearchService {
  apiRoot: string = 'https://opencitations.net/index/coci/api/v1/metadata';
  results: Object[];
  loading: boolean;

  result: string[];
  metadata: string[];

  quota = 300;
  counter = 0;

  constructor(private httpclient: HttpClient) {

  }

  begin_search(DOI: HTMLInputElement) {
    queue.push(DOI.value);
    this.process_queue();
    // console.log(queue);
  }

  process_queue() {
    console.log("Process queue running");
    if (queue.length != 0 && this.counter < this.quota) {
      while (queue.length != 0 && this.counter < this.quota) {
        var current_DOI = queue.pop();
        this.counter += 1;
        this.process_DOI(current_DOI).then(() => {
          // console.log("Loop ran");
          this.process_queue();
        });
      }
    } else {
      console.log("DONE");
    }
  }

  process_DOI(DOI: string) {
    console.log("Process DOI running");
    let promise = new Promise((resolve, reject) => {
      let apiURL = `${this.apiRoot}/${DOI}`;
      this.httpclient.get(apiURL)
      .toPromise()
      .then(
        response => {
          if (response[0]) {
            // console.log(response[0]);
            if (alldata[DOI] == null) {
              alldata[DOI] = response[0];
            }
            if (mapping[DOI] == null) {
              mapping[DOI] = [];
              node_id.push(DOI);
            }
            if (response[0].citation.length != 0) {
              var citations = response[0].citation.split(';');
              for (let i of citations) {
                i = i.replace(/\s/g, '');
                queue.push(i);
                mapping[DOI].push(i);
              }
            }
          }
          resolve();
        },
        msg => {
          reject();
        }
      );
    });
    console.log("Process DOI done");
    return promise;
  }

}

export interface IHash {
  [details: string]: any;
}

export interface SearchResult {
  title: string;
  DOI: string;
  reference_number: number;

}

@Injectable()
export class PlottingService {
  constructor(private service: SearchService) {}

  doSearch(DOI: HTMLInputElement) {
    this.service.begin_search(DOI);
  }
          
  getString(dataTuple: any) {
    let res = '';
    res = res + 'DOI:' + dataTuple.doi + '<br/>';
    res = res + 'Title:' + dataTuple.title + '<br/>';
    res = res + 'Author:' + dataTuple.author + '<br/>';
    res = res + 'Volume:' + dataTuple.volume + '<br/>';
    res = res + 'Year:' + dataTuple.year + '<br/>';
    return res;
  }

  plot_graph() {
    console.log('Starting to plot');
    var nodes = new vis.DataSet();
    var edges = new vis.DataSet([]);
    // console.log(alldata);
    for (let i of node_id) {
      nodes.add({id: i, label: '', title: this.getString(alldata[i]) + 'Group:' + Math.floor(alldata[i].year / 5), group: Math.floor(alldata[i].year / 5)});
      //Math.floor((alldata[i].year % 2000) % 5)
      console.log (Math.floor(alldata[i].year / 5));
      for (let j of mapping[i]) {
        edges.add({from: i, to: j});
      }
    }

    var container = document.getElementById('mynetwork');
    var data = {
      nodes: nodes,
      edges: edges
    };
    var options = {
      nodes: {
        shape: "dot",
        scaling: {
          min: 1,
          max: 1
        },
        font: {
          size: 12,
          face: "Tahoma"
        }
      },
      edges: {
        color: { inherit: true },
        width: 1,
        smooth: {
          type: "continuous"
        }
      },
      physics: {
        // barnesHut: {
        //   gravitationalConstant: -80000, 
        //   springConstant: 0.001, 
        //   springLength: 200,
        //   centralGravity: 0.005
        // },
        forceAtlas2Based: {
          gravitationalConstant: -16,
          centralGravity: 0.005,
          springLength: 500,
          springConstant: 0.18
        },
        maxVelocity: 146,
        // solver: "forceAtlas2Based",
        solver: "barnesHut",
        timestep: 0.35,
        stabilization: { iterations: 150 }
      },
      layout: {
        randomSeed: undefined,
        improvedLayout: true,
        clusterThreshold: 150,
        // hierarchical: {
        //   enabled:false,
        //   levelSeparation: 150,
        //   nodeSpacing: 100,
        //   treeSpacing: 200,
        //   blockShifting: true,
        //   edgeMinimization: true,
        //   parentCentralization: true,
        //   direction: 'UD',
        //   sortMethod: 'hubsize',
        //   shakeTowards: 'nodeSpacing'
        // }
      }
    };
    var anotherOption = {
      joinCondition: function(nodeOptions) {
        return nodeOptions.group === 399;
      }
    }
    var network = new vis.Network(container, data, options);
    // network.clustering.clusterByConnection(node_id[0], anotherOption);
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  displayedColumns: string[] = ['title', 'DOI', 'reference_number'];

  constructor(private plottingService: PlottingService) {}

  foods = [
    {value: 'steak-0', viewValue: 'Steak'},
    {value: 'pizza-1', viewValue: 'Pizza'},
    {value: 'tacos-2', viewValue: 'Tacos'}
  ];

  dataSortingOptions = [
    {value: 'publishTime', viewValue: 'Publish Time'},
    {value: 'noOfCitation', viewValue: 'Popularity'},
    {value: 'author', viewValue: 'Author'},
    {value: 'publisher', viewValue: 'Publisher'},
    {value: 'affiliation', viewValue: 'Affiliation'}
  ]

  noOfNodes = [
    {value: '10', viewValue: '10'},
    {value: '50', viewValue: '50'},
    {value: '100', viewValue: '100'},
    {value: '300', viewValue: '300'}
  ]

  colorOptions = [
    {value: 'default', viewValue: 'Default'},
    {value: 'customize', viewValue: 'Customize'}
  ]

  
  // searchDOI(title: HTMLInputElement) {
    //   this.httpClient.get(`https://api.crossref.org/works?filter=has-full-text:true&mailto=centory98@gmail.com&query.title=${title.value}`)
    //   .subscribe(response => {
      //     console.log(response);
      //     this.result = response['message']['items'];
      //     console.log(this.result);
      //   });
      // }
      
  // searchMetadata(DOI: HTMLInputElement) {
    //   this.httpClient.get(`https://opencitations.net/index/coci/api/v1/metadata/${DOI.value}`)
    //   .subscribe(response => {
      //     console.log(response);
      //     this.metadata = response[0].citation.split(';');
      //     this.doi = DOI.value;
      //     console.log(this.metadata);
      //   });
  // }
          
  doSearch(DOI: HTMLInputElement) {
    this.plottingService.doSearch(DOI);
  }

  plot_graph() {
    this.plottingService.plot_graph();
  }
}