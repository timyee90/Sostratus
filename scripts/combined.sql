drop table if exists characteristics;
drop table if exists reviews;
drop table if exists reviews_photos;
drop table if exists characteristic_reviews;

drop sequence if exists review_sequence;
drop sequence if exists characteristic_review_sequence;
drop sequence if exists reviews_photos_sequence;

-- table cration

create table reviews_photos (id serial primary key, review_id integer, url varchar default null);
create table characteristic_reviews (id serial primary key, characteristic_id integer, review_id integer, value smallint default 0);
create table characteristics (id serial primary key, product_id integer, name varchar default null);
create table reviews (review_id serial primary key, product_id integer, rating smallint default 0, date date, summary varchar default null, 
body varchar default 0, recommend smallint default 0, reported smallint default 0, reviewer_name varchar default null, reviewer_email varchar default null, 
response varchar default null, helpfulness smallint default 0);

-- copy
copy reviews from 'reviews_transformed.csv' delimiter ',' csv header;
copy reviews_photos from 'reviews_photos.csv' delimiter ',' csv header;
copy characteristics from 'characteristics.csv' delimiter ',' csv header;
copy characteristic_reviews from 'characteristic_reviews.csv' delimiter ',' csv header;

-- index creation
drop index if exists characateristics_id;
drop index if exists characateristics_product_id;
drop index if exists review_review_id;
drop index if exists review_product_id;
drop index if exists reviews_photos_review_id;
drop index if exists characteristics_reviews_id;
drop index if exists characteristics_reviews_review_id;

create index characateristics_id on characteristics using hash (id);
create index characateristics_product_id on characteristics using hash (product_id);
create index review_review_id on reviews using hash (review_id);
create index review_product_id on reviews using hash (product_id);
create index reviews_photos_review_id on reviews_photos using hash (review_id);
create index characteristics_reviews_id on characteristic_reviews using hash (id);
create index characteristics_reviews_review_id on characteristic_reviews using hash (review_id);

--- sequence creation

create sequence if not exists review_sequence 
start 5777923
increment by 1 
OWNED by reviews.review_id;


create sequence if not exists characteristic_review_sequence 
start 19337416
increment by 1 
OWNED by characteristic_reviews.id;

create sequence if not exists reviews_photos_sequence
start 2742833
increment by 1
OWNED by reviews_photos.id;


-- photos_aggregation
drop table if exists photos_agg;
drop sequence if exists pr_sequence;
drop index if exists photos_agg_review_id;

-- create table
create table photos_agg as
SELECT  json_agg(json_build_object('id', id, 'url', url)) photos, review_id
FROM reviews_photos
group by review_id;

-- create index
create index photos_agg_review_id on photos_agg using hash (review_id);

-- create sequence
create sequence if not exists pr_sequence 
start 2742833
increment by 1 
OWNED by photos_agg.review_id;

-- characteristics_meta
drop table if exists characteristics_meta;
drop index if exists characteristics_meta_index;
drop sequence if exists characteristics_meta_sequence;

-- create table
create table characteristics_meta as
(SELECT a.product_id, a.review_id, json_agg(json_build_object( 
                      'characteristic_id', characteristic_id, 
                      'name', name, 'value', value)) as characteristics
FROM
(SELECT c.product_id, cr.review_id, cr.characteristic_id, c.name, cr.value AS value 
FROM characteristics c 
INNER JOIN characteristic_reviews cr ON c.id = cr.characteristic_id) a
GROUP BY a.review_id, a.product_id);

-- create index 
create index characteristics_meta_index on characteristics_meta using hash (product_id);

-- create sequence
create sequence if not exists characteristics_meta_sequence 
start 5777923
increment by 1
owned by characteristics_meta.review_id;