import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
declare var $: any;
declare var vis: any;

// declare var queue: Array<string>;
let queue = [];
let node_id = [];
let data: IHash = {};
let mapping: IHash = {};
let stop = true;

export interface IHash {
  [details: string]: any;
}

export interface SearchResult {
  title: string;
  DOI: string;
  reference_number: number;

}

function createSearchResult(searchResult: SearchResult): {title: string, DOI: string, reference_number: number} {
  let newSearchResult = {title: '', DOI: '', reference_number: 0};
  newSearchResult.title = searchResult.title;
  newSearchResult.DOI = searchResult.DOI;
  newSearchResult.reference_number = searchResult.reference_number;
  return newSearchResult;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})


export class AppComponent {
  // displayedColumns: string[] = ['position', 'name', 'weight', 'symbol'];
  displayedColumns: string[] = ['title', 'DOI', 'reference_number'];

  result: string[];
  metadata: string[];
  doi: any;

  constructor(private httpClient: HttpClient) {}

  searchDOI(title: HTMLInputElement) {
// assets/sample.json
    this.httpClient.get(`https://api.crossref.org/works?filter=has-full-text:true&mailto=centory98@gmail.com&query.title=${title.value}`)
    .subscribe(response => {
      console.log(response);
      // tslint:disable-next-line: no-string-literal
      this.result = response['message']['items'];
      console.log(this.result);
    });
  }

  searchMetadata(DOI: HTMLInputElement) {
    // this.httpClient.get(`https://w3id.org/oc/index/coci/api/v1/metadata/${DOI.value}`)
    this.httpClient.get(`https://opencitations.net/index/coci/api/v1/metadata/${DOI.value}`)
    .subscribe(response => {
      console.log(response);
      this.metadata = response[0].citation.split(';');
      this.doi = DOI.value;
      console.log(this.metadata);
    });
  }

  plot() {
    console.log('Starting to plot');
    var nodes = new vis.DataSet();
    var edges = new vis.DataSet([]);
    nodes.add({id: this.doi, label: this.doi});
    for (let i of this.metadata) {
      nodes.add({id: i, label: i});
      edges.add({from: i, to: this.doi});
    }

    var container = document.getElementById('mynetwork');
    var data = {
      nodes: nodes,
      edges: edges
    };
    var options = {};
    var network = new vis.Network(container, data, options);
  }

// newwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
  async process_DOI(DOI: string) {
    this.httpClient.get(`https://opencitations.net/index/coci/api/v1/metadata/${DOI}`)
    .subscribe(response => {
      console.log(response);
      var citations = response[0].citation.split(';');
      if (data[DOI] == null) {
        data[DOI] = response;
      }
      if (mapping[DOI] == null) {
        mapping[DOI] = [];
        node_id.push(DOI);
      }
      for (let i of citations) {
        // console.log('Appending', i);
        i = i.replace(/\s/g, "");
        queue.push(i);
        // console.log(queue);
        mapping[DOI].push(i);
      }
    });
  }

  async process_queue() {
    var quota = 300;
    var counter = 0
    while (queue.length != 0 && counter < quota) {
      var current_DOI = queue.pop();
      await this.process_DOI(current_DOI);
      counter += 1;
      console.log("Loop ran");
      // while (stop) {}
    }
    console.log("DONE");
  }

  async begin_search(DOI: HTMLInputElement) {
    queue.push(DOI.value);
    await this.process_queue();
    console.log(queue);
  }

  plot_graph() {
    console.log('Starting to plot');
    var nodes = new vis.DataSet();
    var edges = new vis.DataSet([]);

    for (let i of node_id) {
      nodes.add({id: i, label: " "});
      for (let j of mapping[i]) {
        edges.add({from: i, to: j});
      }
    }

    var container = document.getElementById('mynetwork');
    var data = {
      nodes: nodes,
      edges: edges
    };
    var options = {};
    var network = new vis.Network(container, data, options);
  }
}
