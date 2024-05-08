const vm = new Vue({
    delimiters: ['${', '}'],
	el: '#app',
	data: {
        options: {
            title: '采购单',
            themeCode: '',
            quantityShow: true,
            unitName: '个',
            columns: 5,
            sortType: 'SORT_BY_GROUP',
            canvasWidth: 0,
            canvasHeight: 0,
            scale: 10
        },
        designsWrapperWidth: 0,
        dragover: null,
        images: [],
        sortType: 'asc'
    },
    mounted: async function () {
        let products = JSON.parse(window.localStorage.getItem('shopping-cart'));
        this.images = products;
        // this.images = listAlignment(products, this.options.columns);
        this.refreshHandler();
    },
	methods: {
		handleImageRemove: async function(index) {
			this.images.splice(index, 1);
            this.refreshHandler();
		},
        imageDownloadHandler: function() {
            const vm = this;
            let title = this.options.title || '款式合集';
            // 主题编码放在副标题之前
            if (this.options.themeCode.length > 0) title = this.options.themeCode + '-' + title;

            const options = { quality: 1, pixelRatio: 2 }; // , canvasWidth: vm.options.canvasWidth, canvasHeight: vm.options.canvasHeight
            htmlToImage.toJpeg(document.getElementById('design-list'), options)
            .then(function (dataUrl) {
                var link = document.createElement('a');
                link.download = title + '.jpeg';
                link.href = dataUrl;
                link.click();
            });
        },
        clearHandler: async function() {
            this.images = [];
            this.options.themeCode = '';
        },
        refreshHandler: async function() {
            const options = this.options;
            this.designsWrapperWidth = 19 * options.scale * options.columns + 10 * (options.columns - 1);
            this.images = listAlignment(this.images, options.columns, options.sortType);
            this.$nextTick(this.updateOutputImageSize);
            this.$forceUpdate();

        },
        sortTypeChangeHandle: function() {
            this.refreshHandler();
        },
        scaleChangeHandle: function(value) {
            document.getElementsByTagName('html')[0].style.fontSize = value + 'px';
            this.refreshHandler();
        },
        columnsChangeHandle: function(value) {
            this.refreshHandler();
        },
        updateOutputImageSize: function() {
            const listDom = document.getElementById('design-list');
            if (null === listDom) return true;

            this.options.canvasWidth = listDom.offsetWidth * 2; // offsetWidth
            this.options.canvasHeight = listDom.offsetHeight * 2;
            this.designsWrapperWidth = 19 * this.options.scale * this.options.columns + 10 * (this.options.columns - 1);
        }
	}
});

function dragOverHandler(event) {
    event.preventDefault();
}

function dropHandler(event) {
    event.preventDefault();

    const items = event.dataTransfer.items;
    const files = validImageFileFilter(items);

    const images = [], itemLength = items.length;
    files.forEach(function (file) {
        const image = {name: file.fileName, baseName: file.baseName, fileName: file.fileName, quantity: 0};

        // 从文件名中自动读取前6个字符作为 themeCode
        if (!vm.options.themeCode) vm.options.themeCode = image.baseName.slice(0, 6);

        const reader = new FileReader();
        reader.onloadend = function(e){
            image.url = e.target.result;
            images.push(image);
            if (images.length === itemLength) vm.images = listAlignment(vm.images.concat(images), vm.options.columns);
            vm.refreshHandler();
        };
        reader.readAsDataURL(file.file);
    });
}

/**
 * 筛选有效的图片类型文件
 *
 * @param {DataTransferItemList} items
 * @returns Array 通过测试的文件数组
 */
function validImageFileFilter(items) {
    const valid = [];
    for (var i = 0; i < items.length; i++) {
        const item = items[i];
        // 仅支持图片类型的文件
        if (item.kind !== 'file' || !item.type.match('^image/')) continue;

        const file = item.getAsFile();
        valid.push({
            file: file,
            baseName: file.name, // 包含扩展名
            fileName: file.name.replace(/\.([0-9a-z]+)(?:[\?#]|$)/i, ''), // 不含扩展名
        });
    }

    return valid;
}

/**
 * 对齐列表数组
 *
 * @param {Array} list
 * @param {Number} columns
 * @returns 对齐后的数组
 */
function listAlignment(list, columns, sortType='SORT_BY_GROUP') {
    columns = parseInt(columns);
    let valid = list.filter(item => item.hidden === undefined);

    const sorter = {
        'SORT_BY_SUBCODE': (items) => {
            items = JSON.parse(JSON.stringify(items));
            items.sort((first, second) => first.name > second.name ? 1 : -1);
            items.sort((first, second) => {
                const diff = first.name.slice(-2) - second.name.slice(-2);
                if (diff > 0) return 1;
                if (diff < 0) return -1;
                return 0;
            });
            return items;
        },
        'SORT_BY_GROUP': (items) => {
            // 按照主题编号+半成品编号组成的key进行分组
            let groups = {};
            for(let item of items) {
                const key = item.name.slice(0, 6);
                if ( !(key in groups) ) groups[key] = [];
                groups[key].push(item);
            }

            // 对名称进行重新格式化：主题编号+图案编号+半成品编号，并按照名称进行升序排序
            const createNewName = (name) => name.slice(0, 3) + name.slice(-2) + name.slice(3, 6);
            groups = Object.values(groups).sort((first, second) => createNewName(first[0].name) > createNewName(second[0].name) ? 1 : -1);

            // 组内产品，按照末2位数字排序
            for(let group of groups) group.sort((first, second) => first.name.slice(-2) > second.name.slice(-2) ? 1 : -1);

            return [].concat(...groups);
        }
    };

    if (sortType in sorter) valid = sorter[sortType](valid);

    const length = valid.length;
    const diff = columns - length % columns;
    if (diff === columns) return valid;

    valid.length = length + diff;
    return valid.fill({url: '', name: '', hidden: true, quantity: 0}, length);
}
