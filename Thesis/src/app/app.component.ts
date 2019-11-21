import { Component, Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import { reject } from 'q';
declare var $: any;
declare var vis: any;

// declare var queue: Array<string>;
let queue = [];
let node_id = [];
let data: IHash = {};
let mapping: IHash = {};
let stop = true;

// service
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
    console.log(queue);
  }

  process_queue() {
    if (queue.length != 0 && this.counter < this.quota) {
      while (queue.length != 0 && this.counter < this.quota) {
        var current_DOI = queue.pop();
        this.counter += 1;
        this.process_DOI(current_DOI).then(() => {
          console.log("Loop ran");
          this.process_queue();
        });
      }
    } else {
      console.log("DONE");
    }
  }

  process_DOI(DOI: string) {
    let promise = new Promise((resolve, reject) => {
      let apiURL = `${this.apiRoot}/${DOI}`;
      this.httpclient.get(apiURL)
      .toPromise()
      .then(
        response => {
          console.log(response);
          if (data[DOI] == null) {
            data[DOI] = response;
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
          resolve();
        },
        msg => {
          reject();
        }
      );
    });
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


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})


export class AppComponent {
  // displayedColumns: string[] = ['position', 'name', 'weight', 'symbol'];
  displayedColumns: string[] = ['title', 'DOI', 'reference_number'];

  constructor(private service: SearchService) {}

  doSearch(DOI: HTMLInputElement) {
    this.service.begin_search(DOI);
  }

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

  // plot() {
  //   console.log('Starting to plot');
  //   var nodes = new vis.DataSet();
  //   var edges = new vis.DataSet([]);
  //   nodes.add({id: this.doi, label: this.doi});
  //   for (let i of this.metadata) {
  //     nodes.add({id: i, label: i});
  //     edges.add({from: i, to: this.doi});
  //   }

  //   var container = document.getElementById('mynetwork');
  //   var data = {
  //     nodes: nodes,
  //     edges: edges
  //   };
  //   var options = {};
  //   var network = new vis.Network(container, data, options);
  // }

// newwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
  // async process_DOI(DOI: string) {
  //   await this.httpClient.get(`https://opencitations.net/index/coci/api/v1/metadata/${DOI}`)
  //   .subscribe(response => {
  //     console.log(response);
  //     var citations = response[0].citation.split(';');
  //     if (data[DOI] == null) {
  //       data[DOI] = response;
  //     }
  //     if (mapping[DOI] == null) {
  //       mapping[DOI] = [];
  //       node_id.push(DOI);
  //     }
  //     for (let i of citations) {
  //       i = i.replace(/\s/g, "");
  //       queue.push(i);
  //       mapping[DOI].push(i);
  //     }
  //   });
  // }



  // async process_queue() {
  //   var quota = 300;
  //   var counter = 0
  //   while (queue.length != 0 && counter < quota) {
  //     var current_DOI = queue.pop();
  //     await this.process_DOI(current_DOI);
  //     counter += 1;
  //     console.log("Loop ran");
  //   }
  //   console.log("DONE");
  // }

  // async begin_search(DOI: HTMLInputElement) {
  //   queue.push(DOI.value);
  //   await this.process_queue();
  //   console.log(queue);
  // }

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
