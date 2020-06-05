const { countOccurrence, characteristicsMeta } = require('../utils/utils.js');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const compression = require('compression');
const app = express();
const port = 3000;

const db = require('../database/index.js');

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(compression());

app.get('/reviews/:id/list', (req, res) => {
  db.query(
    `SELECT r.review_id, r.rating, r.summary, r.recommend, r.response, r.body, r.date, r.reviewer_name, r.helpfulness,
    p.photos
    FROM reviews r
	  LEFT JOIN
    (SELECT  json_agg(json_build_object('id', id, 'url', url)) photos, review_id   FROM reviews_photos
 	  group by review_id) p ON r.review_id = p.review_id
	  WHERE r.product_id = $1;`,
    [req.params.id]
  )
    .then((data) => {
      const page = Number(req.query.page) || 1;
      const count = Number(req.query.count) || 5;
      res.send({
        product: req.params.id.toString(),
        page: page - 1,
        count,
        results: data.rows.slice((page - 1) * count, page * count),
      });
    })
    .catch((err) => {
      console.log(`ERROR: `, err);
    });
});

app.get('/reviews/:id/meta', (req, res) => {
  const product_id = req.params.id;
  db.query(
    `SELECT r.rating, r.recommend, r.review_id, d.characteristics
    FROM reviews r
    JOIN 
    (SELECT a.review_id, json_agg(json_build_object( 
                      'characteristic_id', characteristic_id, 
                      'name', name, 'value', value)) as characteristics
    FROM
    (SELECT cr.review_id, cr.characteristic_id, c.name, cr.value AS value 
    FROM characteristics c 
    INNER JOIN characteristic_reviews cr ON c.id = cr.characteristic_id
    WHERE c.product_id = $1) a
    GROUP BY a.review_id) d
    ON r.review_id = d.review_id
    WHERE product_id = $1;`,
    [product_id]
  )
    .then((data) => {
      const ratings = countOccurrence(data.rows, 'rating');
      const recommended = countOccurrence(data.rows, 'recommend');
      const characteristics = characteristicsMeta(
        data.rows.map((item) => {
          return item.characteristics;
        })
      );
      res.send({ product_id, ratings, recommended, characteristics });
    })
    .catch((err) => {
      console.log(`ERROR: `, err);
    });
});

app.post('/reviews/:product_id', (req, res) => {
  const body = req.body;
  const postDate = new Date();
  const product_id = parseInt(req.params.product_id);
  const values = [
    product_id,
    body.rating,
    postDate,
    body.summary,
    body.body,
    body.recommend,
    body.name,
    body.email,
  ];
  const photos = body.photos.length > 0 ? [...body.photos] : null;
  const characteristics = body.characteristics;

  db.query(
    `INSERT INTO reviews (review_id, product_id, rating, date, summary, body, recommend, reviewer_name, reviewer_email) 
    values (nextval('review_sequence'), $1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING review_id;`,
    values
  )
    .then((data) => {
      return data.rows[0].review_id;
    })
    .then((review_id) => {
      const arrayOfOjbects = [];
      for (let key in characteristics) {
        arrayOfOjbects.push({ [key]: characteristics[key] });
      }

      const promiseArray = arrayOfOjbects.map((char) => {
        return db.query(
          `INSERT INTO 
          characteristic_reviews ( id, characteristic_id, review_id, value )
          values (nextval('characteristic_review_sequence'), $1, $3, $2)
          RETURNING *;`,
          [Object.keys(char)[0], Object.values(char)[0], review_id]
        );
      });

      if (photos !== null) {
        const photosPromise = photos.map((photo) => {
          return db.query(
            `INSERT INTO
            reviews_photos (id, review_id, url)
            values (nextval('reviews_photos_sequence'), $1, $2)
            RETURNING *;
            `,
            [review_id, photo]
          );
        });
        promiseArray.push(...photosPromise);
      }

      Promise.all(promiseArray)
        .then(() => {
          res.sendStatus(201);
        })
        .catch((err) => {
          console.log(`ERROR: `, err);
        });
    })
    .catch((err) => {
      console.log(err);
      res.sendStatus(500);
    });
});

app.put('/reviews/helpful/:review_id', (req, res) => {
  const review_id = req.params.review_id;
  db.query(
    `UPDATE reviews
    SET recommend = recommend + 1
    WHERE review_id = $1
    RETURNING review_id;`,
    [review_id]
  )
    .then((data) => {
      res.sendStatus(204);
    })
    .catch((err) => {
      console.log(err);
      res.sendStatus(500);
    });
});

app.put('/reviews/report/:review_id', (req, res) => {
  const review_id = req.params.review_id;
  db.query(
    `UPDATE reviews
    SET reported = 1
    WHERE review_id = $1
    RETURNING review_id;`,
    [review_id]
  )
    .then((data) => {
      res.sendStatus(204);
    })
    .catch((err) => {
      console.log(err);
      res.sendStatus(500);
    });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
