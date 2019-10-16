import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
declare var $: any;
declare var vis: any;

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
  alldata: any;

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
      this.alldata = this.metadata;
      console.log(this.metadata);
    });
  }

  plot() {
    // tslint:disable-next-line: only-arrow-functions
    // (function($) {
      // tslint:disable-next-line: only-arrow-functions
      $(document).ready(() => {

        console.log('Hello from jQuery!');
        var t = $(this).text();
        var nodes = new vis.DataSet([
          {id: 1, label: 'Node 1'},
          {id: 2, label: 'Node 2'},
          {id: 3, label: 'Node 3'},
          {id: 4, label: 'Node 4'},
          {id: 5, label: 'Node 5'}
        ]);
        // console.log(nodes1);
        console.log(nodes);

        // create an array with edges
        var edges = new vis.DataSet([
        ]);

        // create a network
        var container = document.getElementById('mynetwork');

        // provide the data in the vis format
        var data = {
          nodes: nodes,
          edges: edges
        };
        var options = {};

        // initialize your network!
        var network = new vis.Network(container, data, options);
      });
    // })(jQuery);
  }



}
